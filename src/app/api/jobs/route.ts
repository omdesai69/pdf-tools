import { NextRequest, NextResponse } from 'next/server';
import { generateJobId, isValidJobId } from '@/lib/security/crypto';
import { storage } from '@/lib/security/storage';
import {
    rateLimitMiddleware,
    getClientIP,
    getFingerprint,
    canProcessJob,
    getUsageStats
} from '@/lib/security/rateLimit';
import { jobManager } from '@/lib/jobs/stateMachine';
import { jobQueue } from '@/lib/processing/queue';
import { PDFOperation, OperationOptions } from '@/lib/processing/pdfProcessor';

/**
 * POST /api/jobs - Create a new job
 */
export async function POST(request: NextRequest) {
    // Rate limiting (request rate)
    const rateLimitResponse = await rateLimitMiddleware(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const ip = getClientIP(request);
        const fingerprint = getFingerprint(request);

        // Check daily operation limits
        const limitCheck = canProcessJob(ip, fingerprint, 'anonymous');

        if (!limitCheck.allowed) {
            return NextResponse.json(
                {
                    error: 'DAILY_LIMIT_REACHED',
                    message: limitCheck.reason,
                    usage: limitCheck.usage,
                    retryAfter: Math.ceil((limitCheck.usage.resetsAt - Date.now()) / 1000),
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((limitCheck.usage.resetsAt - Date.now()) / 1000)),
                    }
                }
            );
        }

        const body = await request.json();
        const { operation, options, settings } = body as {
            operation: PDFOperation;
            options?: OperationOptions;
            settings?: any;
        };

        if (!operation) {
            return NextResponse.json(
                { error: 'INVALID_REQUEST', message: 'Operation is required' },
                { status: 400 }
            );
        }

        // Generate secure job ID
        const jobId = generateJobId();

        // Create isolated job directory
        await storage.createJobDirectory(jobId);

        // Create job in state machine
        const jobOpts = options || settings || {};
        const job = await jobManager.createJob(jobId, operation, {
            clientIP: ip,
            options: jobOpts,
        });

        // Include usage stats in response
        const usage = getUsageStats(fingerprint, 'anonymous');

        return NextResponse.json({
            jobId,
            state: job.state,
            uploadUrl: `/api/jobs/${jobId}/upload`,
            statusUrl: `/api/jobs/${jobId}`,
            usage: {
                operationsUsed: usage.operationsUsed,
                operationsRemaining: usage.remaining,
                dailyLimit: usage.operationsLimit,
            },
        });
    } catch (error) {
        console.error('Create job error:', error);
        return NextResponse.json(
            { error: 'SERVER_ERROR', message: 'Failed to create job' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/jobs - Get job stats (admin)
 */
export async function GET(request: NextRequest) {
    const stats = await jobManager.getStats();
    const queueStats = jobQueue.getStats();

    return NextResponse.json({
        jobs: stats,
        queue: queueStats,
    });
}
