/**
 * Job Cleanup Service
 * 
 * Handles:
 * - Expired jobs (past TTL)
 * - Stuck jobs (processing too long without heartbeat)
 * - Orphan files (no matching job)
 */

import { jobManager, JobMetadata } from './stateMachine';
import { storage } from '../security/storage';

// Timeout configs (in ms)
const PROCESSING_TIMEOUT_MS = 60 * 1000;     // 60 seconds max processing
const PENDING_TIMEOUT_MS = 30 * 60 * 1000;   // 30 min max in pending
const COMPLETED_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours after completion

interface CleanupResult {
    expiredJobsCleaned: number;
    stuckJobsCleaned: number;
    orphanFilesCleaned: number;
    errors: string[];
}

/**
 * Clean up expired jobs (past their TTL)
 */
async function cleanExpiredJobs(): Promise<{ count: number; errors: string[] }> {
    const expiredIds = await jobManager.getExpiredJobs();
    let count = 0;
    const errors: string[] = [];

    for (const jobId of expiredIds) {
        try {
            // Delete files first
            await storage.deleteJob(jobId);
            // Then delete job record
            await jobManager.deleteJob(jobId);
            count++;
        } catch (err) {
            errors.push(`Failed to clean expired job ${jobId}: ${err}`);
        }
    }

    return { count, errors };
}

/**
 * Clean up stuck jobs (processing for too long)
 */
async function cleanStuckJobs(): Promise<{ count: number; errors: string[] }> {
    const now = Date.now();
    let count = 0;
    const errors: string[] = [];

    // Get processing jobs
    const processingJobs = await jobManager.getJobsByState('processing');

    for (const job of processingJobs) {
        // Check if job has been processing for too long (no heartbeat)
        const processingTime = now - job.updatedAt;

        if (processingTime > PROCESSING_TIMEOUT_MS) {
            try {
                // Mark as failed with timeout
                await jobManager.transition(job.id, 'failed', {
                    error: 'Processing timeout - job took too long',
                });

                // Clean up files
                await storage.deleteJob(job.id);
                count++;

                console.log(`Cleaned stuck job ${job.id} (processing for ${Math.round(processingTime / 1000)}s)`);
            } catch (err) {
                errors.push(`Failed to clean stuck job ${job.id}: ${err}`);
            }
        }
    }

    // Also clean pending jobs that never started
    const pendingJobs = await jobManager.getJobsByState('pending');

    for (const job of pendingJobs) {
        const pendingTime = now - job.createdAt;

        if (pendingTime > PENDING_TIMEOUT_MS) {
            try {
                await jobManager.transition(job.id, 'cancelled', {
                    error: 'Upload never completed',
                });
                await storage.deleteJob(job.id);
                count++;
            } catch (err) {
                errors.push(`Failed to clean pending job ${job.id}: ${err}`);
            }
        }
    }

    return { count, errors };
}

/**
 * Run full cleanup cycle
 */
export async function runCleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
        expiredJobsCleaned: 0,
        stuckJobsCleaned: 0,
        orphanFilesCleaned: 0,
        errors: [],
    };

    // Clean expired jobs
    const expired = await cleanExpiredJobs();
    result.expiredJobsCleaned = expired.count;
    result.errors.push(...expired.errors);

    // Clean stuck jobs  
    const stuck = await cleanStuckJobs();
    result.stuckJobsCleaned = stuck.count;
    result.errors.push(...stuck.errors);

    return result;
}

/**
 * Get cleanup stats (for monitoring)
 */
export async function getCleanupStats(): Promise<{
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    expiredJobs: number;
}> {
    const stats = await jobManager.getStats();
    const expiredIds = await jobManager.getExpiredJobs();

    return {
        pendingJobs: stats.pending,
        processingJobs: stats.processing,
        completedJobs: stats.completed,
        failedJobs: stats.failed,
        expiredJobs: expiredIds.length,
    };
}

// To run cleanup in a Next.js environment without causing memory leaks,
// you should either:
// 1. Call runCleanup() from a dedicated Cron API route (e.g., /api/cron/cleanup)
// 2. Call runCleanup() lazily during specific user actions
// Do NOT start background setInterval/setTimeout loops in Next.js App Router files.
