import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging';
import { isValidJobId } from '@/lib/security/crypto';

interface RouteParams {
    params: Promise<{ jobId: string }>;
}

/**
 * GET /api/debug/[jobId] - Get debug info for a specific job
 * 
 * Returns logs and state for debugging failed jobs.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { jobId } = await params;

    // Validate job ID
    if (!isValidJobId(jobId)) {
        return NextResponse.json(
            { error: 'Invalid job ID' },
            { status: 400 }
        );
    }

    // Get logs for this job
    const jobLogs = logger.getJobLogs(jobId);

    // Import dynamically to avoid circular deps
    const { jobManager } = await import('@/lib/jobs/stateMachine');
    const job = await jobManager.getJob(jobId);

    if (!job && jobLogs.length === 0) {
        return NextResponse.json(
            { error: 'Job not found and no logs available' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        jobId,
        job: job ? {
            state: job.state,
            operation: job.operation,
            progress: job.progress,
            error: job.error,
            createdAt: new Date(job.createdAt).toISOString(),
            updatedAt: new Date(job.updatedAt).toISOString(),
            expiresAt: new Date(job.expiresAt).toISOString(),
            inputFiles: job.inputFiles,
            outputFile: job.outputFile,
            processingTime: job.processingTime,
        } : null,
        logs: jobLogs.map(l => ({
            timestamp: l.timestamp,
            level: l.level,
            message: l.message,
            error: l.error?.message,
        })),
    });
}
