import { NextRequest, NextResponse } from 'next/server';
import { isValidJobId } from '@/lib/security/crypto';
import { storage } from '@/lib/security/storage';
import { rateLimitMiddleware, getClientIP, checkUploadRateLimit } from '@/lib/security/rateLimit';
import { jobManager } from '@/lib/jobs/stateMachine';

interface RouteParams {
    params: Promise<{ jobId: string }>;
}

/**
 * POST /api/jobs/[jobId]/upload - Upload file(s) for a job
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { jobId } = await params;

    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Validate job ID
    if (!isValidJobId(jobId)) {
        return NextResponse.json(
            { error: 'Invalid job ID' },
            { status: 400 }
        );
    }

    // Check job exists in memory
    let job = await jobManager.getJob(jobId);

    // Serverless fallback: If job not in memory, check if directory exists
    // This handles cold starts where a different instance created the job
    if (!job) {
        const jobDir = await storage.getJobDirectory(jobId);
        if (jobDir) {
            // Directory exists - recreate job in memory
            // We don't know the operation, but we can accept the upload
            await jobManager.createJob(jobId, 'merge'); // Default, will be overridden
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

    // Verify job is in correct state (allow any state in serverless - be lenient)
    if (job.state === 'completed' || job.state === 'failed' || job.state === 'cancelled') {
        return NextResponse.json(
            { error: `Cannot upload to job in ${job.state} state` },
            { status: 400 }
        );
    }

    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        // Calculate total size for rate limiting
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const ip = getClientIP(request);
        const uploadCheck = checkUploadRateLimit(ip, totalSize);

        if (!uploadCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'Upload limit exceeded',
                    retryAfter: Math.ceil((uploadCheck.resetAt - Date.now()) / 1000),
                },
                { status: 429 }
            );
        }

        // Transition to uploading state if still pending
        if (job.state === 'pending') {
            await jobManager.transition(jobId, 'uploading');
        }

        // Save files
        const inputFiles: string[] = [];

        for (const file of files) {
            // Replaced RAM-heavy Buffer.from() with backpressure-aware streaming
            const savedPath = await storage.writeInputFileStream(jobId, file.name, file.stream());
            inputFiles.push(file.name);
        }

        // Update job with file info (stay in uploading state)
        // Get current job to preserve existing inputFiles
        const currentJob = await jobManager.getJob(jobId);
        const allInputFiles = [...(currentJob?.inputFiles || []), ...inputFiles];

        // Update job metadata without changing state
        await jobManager.transition(jobId, 'uploading', {
            inputFiles: allInputFiles,
            fileSize: (currentJob?.fileSize || 0) + totalSize,
        });

        return NextResponse.json({
            success: true,
            filesUploaded: inputFiles.length,
            totalFilesUploaded: allInputFiles.length,
            totalSize: (currentJob?.fileSize || 0) + totalSize,
            message: 'Files uploaded. Call /process to start processing.',
            processUrl: `/api/jobs/${jobId}/process`,
        });
    } catch (error) {
        console.error('Upload error:', error);
        await jobManager.transition(jobId, 'failed', {
            error: 'Upload failed',
        });

        return NextResponse.json(
            { error: 'Upload failed' },
            { status: 500 }
        );
    }
}
