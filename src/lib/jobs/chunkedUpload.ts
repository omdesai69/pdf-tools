import { generateChecksum } from '../security/crypto';

export interface ChunkUploadState {
    jobId: string;
    filename: string;
    totalChunks: number;
    uploadedChunks: Set<number>;
    checksums: Map<number, string>;
    fileSize: number;
    startedAt: number;
    lastChunkAt: number;
}

// In-memory store for upload state
const uploadStates = new Map<string, ChunkUploadState>();

/**
 * Resumable chunked upload manager
 * Handles large file uploads with resume capability
 */
export class ChunkedUploadManager {
    private chunkSize: number;
    private maxChunks: number;
    private uploadTimeoutMs: number;

    constructor(
        chunkSize: number = 5 * 1024 * 1024, // 5MB
        maxChunks: number = 100, // 500MB max file
        uploadTimeoutMs: number = 3600000 // 1 hour
    ) {
        this.chunkSize = chunkSize;
        this.maxChunks = maxChunks;
        this.uploadTimeoutMs = uploadTimeoutMs;
    }

    /**
     * Initialize upload for a job
     */
    async initUpload(
        jobId: string,
        filename: string,
        totalChunks: number,
        fileSize: number
    ): Promise<{ success: boolean; error?: string }> {
        if (totalChunks > this.maxChunks) {
            return { success: false, error: 'FILE_TOO_LARGE' };
        }

        if (uploadStates.has(jobId)) {
            return { success: false, error: 'UPLOAD_ALREADY_EXISTS' };
        }

        uploadStates.set(jobId, {
            jobId,
            filename,
            totalChunks,
            uploadedChunks: new Set(),
            checksums: new Map(),
            fileSize,
            startedAt: Date.now(),
            lastChunkAt: Date.now(),
        });

        return { success: true };
    }

    /**
     * Upload a chunk
     */
    async uploadChunk(
        jobId: string,
        chunkIndex: number,
        data: ArrayBuffer,
        clientChecksum: string
    ): Promise<{ success: boolean; error?: string }> {
        // Trigger lazy cleanup occasionally
        maybeRunChunkCleanup();

        const state = uploadStates.get(jobId);

        if (!state) {
            return { success: false, error: 'UPLOAD_NOT_FOUND' };
        }

        // Check timeout
        if (Date.now() - state.startedAt > this.uploadTimeoutMs) {
            uploadStates.delete(jobId);
            return { success: false, error: 'UPLOAD_TIMEOUT' };
        }

        // Validate chunk index
        if (chunkIndex < 0 || chunkIndex >= state.totalChunks) {
            return { success: false, error: 'INVALID_CHUNK_INDEX' };
        }

        // Skip if already uploaded
        if (state.uploadedChunks.has(chunkIndex)) {
            return { success: true }; // Idempotent
        }

        // Verify checksum
        const serverChecksum = await generateChecksum(data);
        if (serverChecksum !== clientChecksum) {
            return { success: false, error: 'CHECKSUM_MISMATCH' };
        }

        // Mark as uploaded
        state.uploadedChunks.add(chunkIndex);
        state.checksums.set(chunkIndex, serverChecksum);
        state.lastChunkAt = Date.now();

        return { success: true };
    }

    /**
     * Get upload status for resumption
     */
    async getUploadStatus(jobId: string): Promise<{
        exists: boolean;
        uploadedChunks?: number[];
        totalChunks?: number;
        progress?: number;
    }> {
        const state = uploadStates.get(jobId);

        if (!state) {
            return { exists: false };
        }

        // Check timeout
        if (Date.now() - state.startedAt > this.uploadTimeoutMs) {
            uploadStates.delete(jobId);
            return { exists: false };
        }

        return {
            exists: true,
            uploadedChunks: Array.from(state.uploadedChunks),
            totalChunks: state.totalChunks,
            progress: (state.uploadedChunks.size / state.totalChunks) * 100,
        };
    }

    /**
     * Check if upload is complete
     */
    async isComplete(jobId: string): Promise<boolean> {
        const state = uploadStates.get(jobId);

        if (!state) return false;

        return state.uploadedChunks.size === state.totalChunks;
    }

    /**
     * Finalize upload
     */
    async finalizeUpload(jobId: string): Promise<{
        success: boolean;
        error?: string;
        checksums?: Map<number, string>;
    }> {
        const state = uploadStates.get(jobId);

        if (!state) {
            return { success: false, error: 'UPLOAD_NOT_FOUND' };
        }

        if (state.uploadedChunks.size !== state.totalChunks) {
            return { success: false, error: 'UPLOAD_INCOMPLETE' };
        }

        // Return checksums for verification
        const checksums = new Map(state.checksums);

        // Clean up
        uploadStates.delete(jobId);

        return { success: true, checksums };
    }

    /**
     * Cancel upload
     */
    async cancelUpload(jobId: string): Promise<boolean> {
        return uploadStates.delete(jobId);
    }

    /**
     * Cleanup stale uploads
     */
    async cleanupStale(): Promise<number> {
        const now = Date.now();
        let cleaned = 0;

        for (const [jobId, state] of uploadStates) {
            if (now - state.startedAt > this.uploadTimeoutMs) {
                uploadStates.delete(jobId);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Get chunk size
     */
    getChunkSize(): number {
        return this.chunkSize;
    }
}

// Singleton instance
export const uploadManager = new ChunkedUploadManager();

// Lazy cleanup pattern for serverless/Next.js environment
let lastCleanupTime = Date.now();

export const runChunkedUploadCleanup = async () => {
    try {
        await uploadManager.cleanupStale();
    } catch (err) {
        console.error('Chunked upload cleanup error:', err);
    }
};

export function maybeRunChunkCleanup() {
    // Run cleanup at most once every 5 minutes
    if (Date.now() - lastCleanupTime > 300000) {
        runChunkedUploadCleanup().catch(console.error);
        lastCleanupTime = Date.now();
    }
}
