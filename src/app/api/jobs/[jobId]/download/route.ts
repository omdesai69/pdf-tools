import { NextRequest, NextResponse } from 'next/server';
import { isValidJobId } from '@/lib/security/crypto';
import { storage } from '@/lib/security/storage';
import { jobManager } from '@/lib/jobs/stateMachine';

interface RouteParams {
    params: Promise<{ jobId: string }>;
}

/**
 * GET /api/jobs/[jobId]/download - Download processed file
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

    // Get job
    const job = await jobManager.getJob(jobId);

    if (!job) {
        return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
        );
    }

    // Check job state
    if (job.state !== 'completed') {
        return NextResponse.json(
            { error: 'Job not completed' },
            { status: 400 }
        );
    }

    // Check if expired
    if (Date.now() > job.expiresAt) {
        return NextResponse.json(
            { error: 'Download link expired' },
            { status: 410 }
        );
    }

    try {
        // Get output file
        const outputFilename = job.outputFile || 'output.pdf';
        const fileBuffer = await storage.readOutputFile(jobId, outputFilename);

        // Record download
        await jobManager.recordDownload(jobId);

        // Return file - convert Buffer to Uint8Array for NextResponse
        return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${outputFilename}"`,
                'Content-Length': String(fileBuffer.length),
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json(
            { error: 'File not available' },
            { status: 404 }
        );
    }
}
