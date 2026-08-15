import { Collection, ObjectId, WithId } from 'mongodb';
import { getDatabase } from '../mongodb';

export interface JobDocument {
    _id?: ObjectId;
    jobId: string;
    state: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'deleted';
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

let _jobsCollection: Collection<JobDocument> | null = null;

/**
 * Get the jobs collection with lazy initialization
 */
export async function getJobsCollection(): Promise<Collection<JobDocument>> {
    if (_jobsCollection) {
        return _jobsCollection;
    }

    const db = await getDatabase();
    _jobsCollection = db.collection<JobDocument>('jobs');

    // Create indexes for performance (safe to call multiple times)
    await _jobsCollection.createIndex({ jobId: 1 }, { unique: true });
    await _jobsCollection.createIndex({ state: 1 });
    await _jobsCollection.createIndex({ expiresAt: 1 });
    await _jobsCollection.createIndex({ createdAt: -1 });

    return _jobsCollection;
}

/**
 * Convert MongoDB document to JobMetadata format
 */
export function toJobMetadata(doc: WithId<JobDocument> | JobDocument | null): JobDocument | null {
    if (!doc) return null;
    // Remove MongoDB _id and return clean object
    const { _id, ...job } = doc;
    return job as JobDocument;
}
