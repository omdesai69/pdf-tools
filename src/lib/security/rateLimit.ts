import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    maxUploadBytes: number;
    uploadWindowMs: number;
    maxFailures: number;
    failureWindowMs: number;
    penaltyMultiplier: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    reason?: string;
}

// Daily operation limits per tier
interface DailyLimitConfig {
    anonymous: number;
    free: number;
    pro: number;
}

interface UsageStats {
    operationsUsed: number;
    operationsLimit: number;
    remaining: number;
    resetsAt: number;
    tier: 'anonymous' | 'free' | 'pro';
}

// Daily limits from environment (with defaults)
const DAILY_LIMITS: DailyLimitConfig = {
    anonymous: parseInt(process.env.DAILY_LIMIT_ANONYMOUS || '999'),
    free: parseInt(process.env.DAILY_LIMIT_FREE || '999'),
    pro: parseInt(process.env.DAILY_LIMIT_PRO || '999999'),
};

// In-memory stores
// NOTE: On Vercel serverless, these reset on cold starts.
// Jobs created on one instance may not be visible on another.
// This is acceptable for MVP - upgrade to Redis for production scale.
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const uploadVolumes = new Map<string, { bytes: number; resetAt: number }>();
const failureCounts = new Map<string, { count: number; resetAt: number }>();
const penalties = new Map<string, { multiplier: number; expiresAt: number }>();

// Daily operation tracking - keyed by fingerprint + date
const dailyOperations = new Map<string, { count: number; date: string }>();

// Rate limit config from environment (with defaults)
const DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests: parseInt(process.env.RATE_LIMIT_RPM || '60'),
    windowMs: 60000,
    maxUploadBytes: 500 * 1024 * 1024, // 500MB per hour
    uploadWindowMs: 3600000,
    maxFailures: 10,
    failureWindowMs: 600000,
    penaltyMultiplier: 2,
};


/**
 * Get client IP with proxy support
 */
export function getClientIP(request: NextRequest): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
        return xff.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Generate browser fingerprint for abuse detection
 */
export function getFingerprint(request: NextRequest): string {
    const ua = request.headers.get('user-agent') || '';
    const lang = request.headers.get('accept-language') || '';
    const accept = request.headers.get('accept') || '';

    // Simple hash
    const combined = `${ua}|${lang}|${accept}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Check request rate limit
 */
export function checkRequestRate(ip: string, config = DEFAULT_CONFIG): RateLimitResult {
    // Trigger lazy cleanup occasionally
    maybeRunCleanup();

    const now = Date.now();
    const key = `req:${ip}`;
    const penalty = penalties.get(ip)?.multiplier || 1;

    let record = requestCounts.get(key);

    if (!record || now > record.resetAt) {
        record = { count: 0, resetAt: now + (config.windowMs * penalty) };
        requestCounts.set(key, record);
    }

    record.count++;

    const effectiveMax = Math.floor(config.maxRequests / penalty);

    return {
        allowed: record.count <= effectiveMax,
        remaining: Math.max(0, effectiveMax - record.count),
        resetAt: record.resetAt,
        reason: record.count > effectiveMax ? 'Too many requests' : undefined,
    };
}

/**
 * Check upload volume limit
 */
export function checkUploadVolume(ip: string, bytes: number, config = DEFAULT_CONFIG): RateLimitResult {
    const now = Date.now();
    const key = `upload:${ip}`;
    const penalty = penalties.get(ip)?.multiplier || 1;

    let record = uploadVolumes.get(key);

    if (!record || now > record.resetAt) {
        record = { bytes: 0, resetAt: now + config.uploadWindowMs };
        uploadVolumes.set(key, record);
    }

    record.bytes += bytes;

    const effectiveMax = Math.floor(config.maxUploadBytes / penalty);

    return {
        allowed: record.bytes <= effectiveMax,
        remaining: Math.max(0, effectiveMax - record.bytes),
        resetAt: record.resetAt,
        reason: record.bytes > effectiveMax ? 'Upload quota exceeded' : undefined,
    };
}

/**
 * Record a failure for abuse detection
 */
export function recordFailure(ip: string, config = DEFAULT_CONFIG): void {
    const now = Date.now();
    const key = `fail:${ip}`;

    let record = failureCounts.get(key);

    if (!record || now > record.resetAt) {
        record = { count: 0, resetAt: now + config.failureWindowMs };
        failureCounts.set(key, record);
    }

    record.count++;

    // Apply penalty if too many failures
    if (record.count > config.maxFailures) {
        const currentPenalty = penalties.get(ip)?.multiplier || 1;
        penalties.set(ip, {
            multiplier: currentPenalty * config.penaltyMultiplier,
            expiresAt: now + 3600000 // 1 hour penalty
        });
    }
}

/**
 * Rate limiting middleware for API routes
 */
export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const ip = getClientIP(request);

    // Check request rate
    const rateResult = checkRequestRate(ip);

    if (!rateResult.allowed) {
        recordFailure(ip);

        return NextResponse.json(
            {
                error: 'rate_limit_exceeded',
                message: rateResult.reason,
                retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
                    'X-RateLimit-Remaining': String(rateResult.remaining),
                    'X-RateLimit-Reset': String(rateResult.resetAt),
                },
            }
        );
    }

    return null; // Allow request to proceed
}

/**
 * Check rate limits for uploads
 */
export function checkUploadRateLimit(ip: string, fileSize: number): RateLimitResult {
    const uploadResult = checkUploadVolume(ip, fileSize);

    if (!uploadResult.allowed) {
        recordFailure(ip);
    }

    return uploadResult;
}

/**
 * Get today's date in UTC (for daily limit resets)
 */
function getTodayUTC(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get midnight UTC for reset time
 */
function getMidnightUTC(): number {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime();
}

/**
 * Get usage statistics for a fingerprint
 */
export function getUsageStats(fingerprint: string, tier: 'anonymous' | 'free' | 'pro' = 'anonymous'): UsageStats {
    const today = getTodayUTC();
    const key = `${fingerprint}:${today}`;
    const record = dailyOperations.get(key);
    
    // Strictly validate tier to prevent prototype pollution or invalid property access
    const safeTier = (tier === 'pro' || tier === 'free') ? tier : 'anonymous';
    const limit = DAILY_LIMITS[safeTier];

    const operationsUsed = record?.count || 0;

    return {
        operationsUsed,
        operationsLimit: limit,
        remaining: Math.max(0, limit - operationsUsed),
        resetsAt: getMidnightUTC(),
        tier,
    };
}

/**
 * Check if daily limit allows another operation
 */
export function checkDailyLimit(fingerprint: string, tier: 'anonymous' | 'free' | 'pro' = 'anonymous'): RateLimitResult {
    const stats = getUsageStats(fingerprint, tier);

    return {
        allowed: stats.remaining > 0,
        remaining: stats.remaining,
        resetAt: stats.resetsAt,
        reason: stats.remaining <= 0 ? `Daily limit of ${stats.operationsLimit} operations reached` : undefined,
    };
}

/**
 * Record an operation against daily limit
 */
export function recordOperation(fingerprint: string): void {
    const today = getTodayUTC();
    const key = `${fingerprint}:${today}`;

    const record = dailyOperations.get(key);

    if (record && record.date === today) {
        record.count++;
    } else {
        dailyOperations.set(key, { count: 1, date: today });
    }
}

/**
 * Check if a job can be processed (combines all limits)
 */
export function canProcessJob(
    ip: string,
    fingerprint: string,
    tier: 'anonymous' | 'free' | 'pro' = 'anonymous'
): { allowed: boolean; reason?: string; usage: UsageStats } {
    // Check daily limit
    const dailyResult = checkDailyLimit(fingerprint, tier);
    if (!dailyResult.allowed) {
        return {
            allowed: false,
            reason: dailyResult.reason,
            usage: getUsageStats(fingerprint, tier),
        };
    }

    // Check request rate
    const rateResult = checkRequestRate(ip);
    if (!rateResult.allowed) {
        return {
            allowed: false,
            reason: rateResult.reason,
            usage: getUsageStats(fingerprint, tier),
        };
    }

    return {
        allowed: true,
        usage: getUsageStats(fingerprint, tier),
    };
}

// Export types
export type { UsageStats };

// Lazy cleanup pattern for serverless/Next.js environment
// Avoids HMR memory leaks from setInterval/setTimeout in development
let lastCleanupTime = Date.now();

export const runRateLimitCleanup = () => {
    try {
        const now = Date.now();
        const today = getTodayUTC();

        for (const [key, record] of requestCounts) {
            if (now > record.resetAt) requestCounts.delete(key);
        }

        for (const [key, record] of uploadVolumes) {
            if (now > record.resetAt) uploadVolumes.delete(key);
        }

        for (const [key, record] of failureCounts) {
            if (now > record.resetAt) failureCounts.delete(key);
        }

        // Clean up old daily operation records (keep today only)
        for (const [key, record] of dailyOperations) {
            if (record.date !== today) dailyOperations.delete(key);
        }
    } catch (err) {
        console.error('Rate limit cleanup error:', err);
    }
};

export function maybeRunCleanup() {
    // Run cleanup at most once per minute
    if (Date.now() - lastCleanupTime > 60000) {
        runRateLimitCleanup();
        lastCleanupTime = Date.now();
    }
}
