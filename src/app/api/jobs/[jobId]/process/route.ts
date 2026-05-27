import { NextRequest, NextResponse } from 'next/server';
import { isValidJobId } from '@/lib/security/crypto';
import { jobManager } from '@/lib/jobs/stateMachine';
import { jobQueue } from '@/lib/processing/queue';
import { PDFOperation, pdfProcessor } from '@/lib/processing/pdfProcessor';
import { getFingerprint, recordOperation } from '@/lib/security/rateLimit';
import { storage } from '@/lib/security/storage';

interface RouteParams {
    params: Promise<{ jobId: string }>;
}

/**
 * POST /api/jobs/[jobId]/process - Start processing a job
 * 
 * Called after all files are uploaded. Validates job state and queues for processing.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { jobId } = await params;

    // Validate job ID format
    if (!isValidJobId(jobId)) {
        return NextResponse.json(
            { error: 'INVALID_JOB_ID', message: 'Invalid job ID format' },
            { status: 400 }
        );
    }

    // Get job from memory
    let job = await jobManager.getJob(jobId);

    // Serverless fallback: If job not in memory, check if directory exists
    if (!job) {
        const jobDir = await storage.getJobDirectory(jobId);
        if (jobDir) {
            // Try to get operation from request body
            let operation: PDFOperation = 'merge';
            try {
                const body = await request.clone().json();
                if (body.operation) operation = body.operation;
            } catch { }

            // Recreate job in memory
            await jobManager.createJob(jobId, operation);
            await jobManager.transition(jobId, 'uploading');
            job = await jobManager.getJob(jobId);
        }
    }

    if (!job) {
        return NextResponse.json(
            {
                error: 'JOB_NOT_FOUND',
                message: 'Job not found. It may have expired or the server restarted.',
                hint: 'Please try again from the beginning.',
            },
            { status: 404 }
        );
    }

    // Verify job has uploaded files and is in correct state
    if (job.state === 'pending') {
        return NextResponse.json(
            { error: 'FILES_MISSING', message: 'No files have been uploaded yet' },
            { status: 400 }
        );
    }

    if (job.state === 'processing' || job.state === 'queued') {
        return NextResponse.json(
            { error: 'ALREADY_PROCESSING', message: 'Job is already being processed' },
            { status: 409 }
        );
    }

    if (job.state === 'completed') {
        return NextResponse.json(
            {
                error: 'ALREADY_COMPLETED',
                message: 'Job already completed',
                downloadUrl: `/api/jobs/${jobId}/download`
            },
            { status: 409 }
        );
    }

    if (job.state !== 'uploading') {
        return NextResponse.json(
            { error: 'INVALID_STATE', message: `Cannot process job in ${job.state} state` },
            { status: 400 }
        );
    }

    // Check that we have at least one file
    if (!job.inputFiles || job.inputFiles.length === 0) {
        return NextResponse.json(
            { error: 'FILES_MISSING', message: 'No files uploaded for this job' },
            { status: 400 }
        );
    }

    try {
        // Record operation against daily limit
        const fingerprint = getFingerprint(request);
        recordOperation(fingerprint);

        // Transition to queued
        const transitionResult = await jobManager.transition(jobId, 'queued');

        if (!transitionResult.success) {
            return NextResponse.json(
                { error: 'TRANSITION_FAILED', message: transitionResult.error },
                { status: 500 }
            );
        }

        // In Vercel serverless, background promises are killed instantly when the response is returned.
        // We must process the PDF synchronously before returning the response.
        await jobManager.transition(jobId, 'processing');
        
        try {
            await pdfProcessor.process(jobId, job.operation as PDFOperation, job.options || {});
            
            return NextResponse.json({
                status: 'COMPLETED',
                message: 'Processing finished successfully'
            }, { status: 200 });
        } catch (processError) {
            console.error(`Job ${jobId} failed during synchronous processing:`, processError);
            await jobManager.transition(jobId, 'failed', {
                error: 'Processing failed',
            });
            throw processError;
        }

    } catch (error) {
        console.error('Process start error:', error);

        // Mark job as failed
        await jobManager.transition(jobId, 'failed', {
            error: 'Failed to start processing',
        });

        return NextResponse.json(
            { error: 'PROCESSING_FAILED', message: 'Failed to start processing', retryable: true },
            { status: 500 }
        );
    }
}
