import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { generateJobId } from './crypto';

export interface JobDirectory {
    jobId: string;
    path: string;
    inputDir: string;
    outputDir: string;
    tempDir: string;
}

/**
 * Secure file storage manager with guaranteed isolation and cleanup
 */
export class SecureStorageManager {
    private basePath: string;
    private maxAgeMs: number;

    constructor(basePath: string = '/tmp/pdf-jobs', maxAgeMs: number = 3600000) {
        this.basePath = basePath;
        this.maxAgeMs = maxAgeMs;
    }

    /**
     * Create isolated job directory with metadata
     */
    async createJobDirectory(jobId?: string): Promise<JobDirectory> {
        const id = jobId || generateJobId();

        // Two-level directory structure to prevent filesystem bottlenecks
        const prefix = id.substring(0, 2);
        const jobPath = path.join(this.basePath, prefix, id);

        const dirs = {
            jobId: id,
            path: jobPath,
            inputDir: path.join(jobPath, 'input'),
            outputDir: path.join(jobPath, 'output'),
            tempDir: path.join(jobPath, 'temp'),
        };

        // Create all directories
        await fs.mkdir(dirs.inputDir, { recursive: true });
        await fs.mkdir(dirs.outputDir, { recursive: true });
        await fs.mkdir(dirs.tempDir, { recursive: true });

        // Write creation timestamp for cleanup
        await fs.writeFile(
            path.join(jobPath, '.metadata'),
            JSON.stringify({
                createdAt: Date.now(),
                jobId: id,
            })
        );

        return dirs;
    }

    /**
     * Get job directory paths
     */
    async getJobDirectory(jobId: string): Promise<JobDirectory | null> {
        const prefix = jobId.substring(0, 2);
        const jobPath = path.join(this.basePath, prefix, jobId);

        try {
            await fs.access(jobPath);
            return {
                jobId,
                path: jobPath,
                inputDir: path.join(jobPath, 'input'),
                outputDir: path.join(jobPath, 'output'),
                tempDir: path.join(jobPath, 'temp'),
            };
        } catch {
            return null;
        }
    }

    /**
     * Secure file deletion with optional overwrite
     */
    async secureDelete(filePath: string): Promise<void> {
        try {
            const stats = await fs.stat(filePath);

            if (stats.isFile()) {
                // Overwrite first few KB before deletion (for SSD, relies on TRIM)
                const overwriteSize = Math.min(stats.size, 4096);
                const randomBytes = crypto.randomBytes(overwriteSize);

                const handle = await fs.open(filePath, 'r+');
                await handle.write(randomBytes, 0, overwriteSize, 0);
                await handle.close();

                await fs.unlink(filePath);
            } else if (stats.isDirectory()) {
                const entries = await fs.readdir(filePath);
                for (const entry of entries) {
                    await this.secureDelete(path.join(filePath, entry));
                }
                await fs.rmdir(filePath);
            }
        } catch (error) {
            // Log but don't throw - cleanup should be best-effort
            console.error(`Failed to delete ${filePath}:`, error);
        }
    }

    /**
     * Delete job directory securely
     */
    async deleteJob(jobId: string): Promise<boolean> {
        const jobDir = await this.getJobDirectory(jobId);
        if (!jobDir) return false;

        await this.secureDelete(jobDir.path);
        return true;
    }

    /**
     * Cleanup expired jobs - run as cron job
     */
    async cleanupExpired(): Promise<{ deleted: number; errors: number }> {
        const now = Date.now();
        let deleted = 0;
        let errors = 0;

        try {
            const prefixes = await fs.readdir(this.basePath);

            for (const prefix of prefixes) {
                const prefixPath = path.join(this.basePath, prefix);
                const prefixStats = await fs.stat(prefixPath);

                if (!prefixStats.isDirectory()) continue;

                const jobs = await fs.readdir(prefixPath);

                for (const jobId of jobs) {
                    const metadataPath = path.join(prefixPath, jobId, '.metadata');

                    try {
                        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

                        if (now - metadata.createdAt > this.maxAgeMs) {
                            await this.secureDelete(path.join(prefixPath, jobId));
                            deleted++;
                        }
                    } catch {
                        // Orphaned directory without metadata - delete immediately
                        await this.secureDelete(path.join(prefixPath, jobId));
                        deleted++;
                    }
                }
            }
        } catch (error) {
            console.error('Cleanup error:', error);
            errors++;
        }

        return { deleted, errors };
    }

    /**
     * Write file to job input directory
     */
    async writeInputFile(jobId: string, filename: string, data: Buffer): Promise<string> {
        const jobDir = await this.getJobDirectory(jobId);
        if (!jobDir) throw new Error('Job directory not found');

        // Sanitize filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(jobDir.inputDir, safeFilename);

        await fs.writeFile(filePath, data);
        return filePath;
    }

    /**
     * Write file to job input directory using streams to avoid RAM spikes
     */
    async writeInputFileStream(jobId: string, filename: string, stream: ReadableStream<Uint8Array>): Promise<string> {
        const jobDir = await this.getJobDirectory(jobId);
        if (!jobDir) throw new Error('Job directory not found');

        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(jobDir.inputDir, safeFilename);

        const fileHandle = await fs.open(filePath, 'w');
        const writeStream = fileHandle.createWriteStream();

        const reader = stream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Write chunk and handle backpressure
                if (!writeStream.write(value)) {
                    await new Promise<void>(resolve => writeStream.once('drain', () => resolve()));
                }
            }
        } finally {
            writeStream.end();
            reader.releaseLock();
            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            });
            await fileHandle.close();
        }
        
        return filePath;
    }

    /**
     * Read output file
     */
    async readOutputFile(jobId: string, filename: string): Promise<Buffer> {
        const jobDir = await this.getJobDirectory(jobId);
        if (!jobDir) throw new Error('Job directory not found');

        const filePath = path.join(jobDir.outputDir, filename);
        return fs.readFile(filePath);
    }
}

// Singleton instance
export const storage = new SecureStorageManager(
    process.env.JOB_STORAGE_PATH || '/tmp/pdf-jobs',
    parseInt(process.env.JOB_MAX_AGE_MS || '3600000')
);
