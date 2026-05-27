import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/jobs/stateMachine';
import { jobQueue } from '@/lib/processing/queue';
import { getCleanupStats } from '@/lib/jobs/cleanup';
import { logger } from '@/lib/logging';

/**
 * GET /api/health - Health check endpoint
 * 
 * Returns system health status for monitoring.
 */
export async function GET(request: NextRequest) {
    try {
        const jobStats = await jobManager.getStats();
        const queueStats = jobQueue.getStats();
        const cleanupStats = await getCleanupStats();
        const errorCount = logger.getErrorCount(5);

        // Determine overall health
        const issues: string[] = [];

        // Check for stuck jobs
        if (cleanupStats.processingJobs > 10) {
            issues.push('High number of processing jobs');
        }

        // Check for high error rate
        if (errorCount > 10) {
            issues.push('High error rate in last 5 minutes');
        }

        // Check queue depth
        const totalQueued = queueStats.queued.high + queueStats.queued.normal + queueStats.queued.low;
        if (totalQueued > 50) {
            issues.push('Queue backlog detected');
        }

        const status = issues.length === 0 ? 'healthy' : 'degraded';

        return NextResponse.json({
            status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            issues,
            metrics: {
                jobs: {
                    pending: jobStats.pending,
                    processing: jobStats.processing,
                    completed: jobStats.completed,
                    failed: jobStats.failed,
                    expired: cleanupStats.expiredJobs,
                },
                queue: {
                    high: queueStats.queued.high,
                    normal: queueStats.queued.normal,
                    low: queueStats.queued.low,
                    processing: queueStats.processing,
                },
                errors: {
                    last5min: errorCount,
                },
            },
        });
    } catch (error) {
        logger.error('Health check failed', {}, error as Error);

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        }, { status: 500 });
    }
}
