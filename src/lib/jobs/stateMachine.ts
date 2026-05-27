/**
 * Job State Machine with atomic transitions
 * Uses MongoDB for persistence across serverless invocations
 */

import { getJobsCollection, JobDocument, toJobMetadata } from '../db/models/job';

export type JobState =
    | 'pending'
    | 'uploading'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'deleted';

export interface JobMetadata {
    id: string;
    state: JobState;
    operation: string;
    inputFiles: string[];
    outputFile?: string;
    progress: number;
    error?: string;
    createdAt: number;
    updatedAt: number;
    expiresAt: number;
    downloadCount: number;
    fileSize: number;
    processingTime?: number;
    clientIP?: string;
    options?: any;
}

// Valid state transitions
const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
    pending: ['uploading', 'cancelled'],
    uploading: ['uploading', 'queued', 'failed', 'cancelled'], // uploading → uploading for multi-file
    queued: ['processing', 'cancelled'],
    processing: ['completed', 'failed', 'cancelled'],
    completed: ['deleted'],
    failed: ['pending', 'deleted'], // Allow retry
    cancelled: ['deleted'],
    deleted: [],
};

/**
 * Convert MongoDB document to JobMetadata
 */
function docToMetadata(doc: JobDocument): JobMetadata {
    return {
        id: doc.jobId,
        state: doc.state,
        operation: doc.operation,
        inputFiles: doc.inputFiles,
        outputFile: doc.outputFile,
        progress: doc.progress,
        error: doc.error,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        expiresAt: doc.expiresAt,
        downloadCount: doc.downloadCount,
        fileSize: doc.fileSize,
        processingTime: doc.processingTime,
        clientIP: doc.clientIP,
        options: doc.options,
    };
}

export class JobStateMachine {
    /**
     * Create a new job
     */
    async createJob(
        jobId: string,
        operation: string,
        metadata: Partial<JobMetadata> = {}
    ): Promise<JobMetadata> {
        const now = Date.now();
        const collection = await getJobsCollection();

        const jobDoc: JobDocument = {
            jobId,
            state: 'pending',
            operation,
            inputFiles: [],
            progress: 0,
            createdAt: now,
            updatedAt: now,
            expiresAt: now + 3600000, // 1 hour default
            downloadCount: 0,
            fileSize: 0,
            ...metadata,
        };

        await collection.insertOne(jobDoc);

        return {
            id: jobId,
            state: jobDoc.state,
            operation: jobDoc.operation,
            inputFiles: jobDoc.inputFiles,
            progress: jobDoc.progress,
            createdAt: jobDoc.createdAt,
            updatedAt: jobDoc.updatedAt,
            expiresAt: jobDoc.expiresAt,
            downloadCount: jobDoc.downloadCount,
            fileSize: jobDoc.fileSize,
            clientIP: jobDoc.clientIP,
            options: jobDoc.options,
        };
    }

    /**
     * Get job by ID
     */
    async getJob(jobId: string): Promise<JobMetadata | null> {
        const collection = await getJobsCollection();
        const doc = await collection.findOne({ jobId });

        if (!doc) return null;
        return docToMetadata(toJobMetadata(doc) as JobDocument);
    }

    /**
     * Atomically transition job state
     */
    async transition(
        jobId: string,
        newState: JobState,
        updates: Partial<JobMetadata> = {}
    ): Promise<{ success: boolean; job?: JobMetadata; error?: string }> {
        const collection = await getJobsCollection();

        // First get current state to validate transition
        const currentDoc = await collection.findOne({ jobId });

        if (!currentDoc) {
            return { success: false, error: 'JOB_NOT_FOUND' };
        }

        const validNextStates = VALID_TRANSITIONS[currentDoc.state];

        if (!validNextStates.includes(newState)) {
            return {
                success: false,
                error: `INVALID_TRANSITION: Cannot go from ${currentDoc.state} to ${newState}`,
            };
        }

        // Prepare update document
        const updateFields: Partial<JobDocument> = {
            state: newState,
            updatedAt: Date.now(),
        };

        // Map JobMetadata fields to JobDocument fields
        if (updates.outputFile !== undefined) updateFields.outputFile = updates.outputFile;
        if (updates.error !== undefined) updateFields.error = updates.error;
        if (updates.progress !== undefined) updateFields.progress = updates.progress;
        if (updates.fileSize !== undefined) updateFields.fileSize = updates.fileSize;
        if (updates.processingTime !== undefined) updateFields.processingTime = updates.processingTime;
        if (updates.inputFiles !== undefined) updateFields.inputFiles = updates.inputFiles;
        if (updates.options !== undefined) updateFields.options = updates.options;

        // Atomic update with state validation
        const result = await collection.findOneAndUpdate(
            { jobId, state: currentDoc.state }, // Ensure state hasn't changed
            { $set: updateFields },
            { returnDocument: 'after' }
        );

        if (!result) {
            return { success: false, error: 'CONCURRENT_MODIFICATION' };
        }

        return {
            success: true,
            job: docToMetadata(toJobMetadata(result) as JobDocument)
        };
    }

    /**
     * Update job progress
     */
    async updateProgress(jobId: string, progress: number): Promise<boolean> {
        const collection = await getJobsCollection();

        const result = await collection.updateOne(
            { jobId, state: 'processing' },
            {
                $set: {
                    progress: Math.min(100, Math.max(0, progress)),
                    updatedAt: Date.now()
                }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Mark job as downloaded
     */
    async recordDownload(jobId: string): Promise<boolean> {
        const collection = await getJobsCollection();

        const result = await collection.updateOne(
            { jobId, state: 'completed' },
            {
                $inc: { downloadCount: 1 },
                $set: { updatedAt: Date.now() }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Extend job expiry
     */
    async extendExpiry(jobId: string, additionalMs: number): Promise<boolean> {
        const collection = await getJobsCollection();

        const doc = await collection.findOne({ jobId });
        if (!doc) return false;

        // Max 24 hours total
        const maxExpiry = doc.createdAt + 86400000;
        const newExpiry = Math.min(doc.expiresAt + additionalMs, maxExpiry);

        const result = await collection.updateOne(
            { jobId },
            { $set: { expiresAt: newExpiry, updatedAt: Date.now() } }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Get all expired jobs
     */
    async getExpiredJobs(): Promise<string[]> {
        const collection = await getJobsCollection();
        const now = Date.now();

        const docs = await collection.find({
            expiresAt: { $lt: now },
            state: { $ne: 'deleted' }
        }).toArray();

        return docs.map(doc => doc.jobId);
    }

    /**
     * Get jobs by state
     */
    async getJobsByState(state: JobState): Promise<JobMetadata[]> {
        const collection = await getJobsCollection();

        const docs = await collection.find({ state }).toArray();
        return docs.map(doc => docToMetadata(toJobMetadata(doc) as JobDocument));
    }

    /**
     * Delete job from database
     */
    async deleteJob(jobId: string): Promise<boolean> {
        const collection = await getJobsCollection();
        const result = await collection.deleteOne({ jobId });
        return result.deletedCount > 0;
    }

    /**
     * Get job stats
     */
    async getStats(): Promise<Record<JobState, number>> {
        const collection = await getJobsCollection();

        const pipeline = [
            { $group: { _id: '$state', count: { $sum: 1 } } }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        const stats: Record<JobState, number> = {
            pending: 0,
            uploading: 0,
            queued: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            deleted: 0,
        };

        for (const result of results) {
            if (result._id in stats) {
                stats[result._id as JobState] = result.count;
            }
        }

        return stats;
    }
}

// Singleton instance
export const jobManager = new JobStateMachine();
