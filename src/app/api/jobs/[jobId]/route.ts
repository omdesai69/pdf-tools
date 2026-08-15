
import { NextRequest, NextResponse } from 'next/server';
import { isValidJobId } from '@/lib/security/crypto';
import { storage } from '@/lib/security/storage';
import { jobManager } from '@/lib/jobs/stateMachine';
import { jobQueue } from '@/lib/processing/queue';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ jobId: string }>;
}

/**
 * GET /api/jobs/[jobId] - Get job status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { jobId } = await params;

    // Validate job ID format
    if (!isValidJobId(jobId)) {
        return NextResponse.json(
            { error: 'INVALID_JOB_ID', message: 'Invalid job ID format' },
            { status: 400 }
        );
    }

    const job = await jobManager.getJob(jobId);

    if (!job) {
        // Job not found - could be expired or serverless cold start
        // Check if files exist on disk as fallback
        const jobDir = await storage.getJobDirectory(jobId);

        if (jobDir) {
            // Files exist but memory was cleared - job likely completed but state lost
            return NextResponse.json({
                error: 'JOB_STATE_LOST',
                message: 'Job data expired. Files may still be available if recently completed.',
                hint: 'Try downloading again or restart the operation.',
                retryable: true,
            }, { status: 410 }); // Gone
        }

        return NextResponse.json({
            error: 'JOB_NOT_FOUND',
            message: 'Job not found. It may have expired or been cleaned up.',
            hint: 'Jobs expire after 1 hour. Please try again.',
            retryable: true,
        }, { status: 404 });
    }

    return NextResponse.json({
        id: job.id,
        state: job.state,
        operation: job.operation,
        progress: job.progress,
        error: job.error,
        createdAt: job.createdAt,
        expiresAt: job.expiresAt,
        downloadCount: job.downloadCount,
        outputFile: job.outputFile,
        downloadUrl: job.state === 'completed' ? `/api/jobs/${jobId}/download` : null,
    });
}

/**
 * DELETE /api/jobs/[jobId] - Cancel job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { jobId } = await params;

    if (!isValidJobId(jobId)) {
        return NextResponse.json(
            { error: 'Invalid job ID' },
            { status: 400 }
        );
    }

    const job = await jobManager.getJob(jobId);

    if (!job) {
        return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
        );
    }

    // Cancel if queued
    await jobQueue.cancel(jobId);

    // Transition to cancelled
    const result = await jobManager.transition(jobId, 'cancelled');

    // Clean up files
    await storage.deleteJob(jobId);

    return NextResponse.json({
        success: true,
        previousState: job.state,
    });
}
