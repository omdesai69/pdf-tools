/**
 * Error Logging & Tracking Utility
 * 
 * Provides structured logging for debugging and monitoring.
 * In production, this would integrate with Sentry/DataDog/etc.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    jobId?: string;
    operation?: string;
    ip?: string;
    fingerprint?: string;
    fileSize?: number;
    duration?: number;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

// In-memory log buffer (for debugging, would persist in production)
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 1000;

/**
 * Create a structured log entry
 */
function createLogEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : undefined,
    };
}

/**
 * Log and store entry
 */
function log(level: LogLevel, message: string, context: LogContext = {}, error?: Error): void {
    const entry = createLogEntry(level, message, context, error);

    // Store in buffer
    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOG_BUFFER) {
        logBuffer.shift();
    }

    // Console output (with colors in dev)
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const contextStr = Object.keys(context).length > 0
        ? ` ${JSON.stringify(context)}`
        : '';

    switch (level) {
        case 'debug':
            console.debug(`${prefix} ${message}${contextStr}`);
            break;
        case 'info':
            console.info(`${prefix} ${message}${contextStr}`);
            break;
        case 'warn':
            console.warn(`${prefix} ${message}${contextStr}`);
            break;
        case 'error':
            console.error(`${prefix} ${message}${contextStr}`, error || '');
            break;
    }
}

// Public API
export const logger = {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext, error?: Error) => log('error', message, context, error),

    /**
     * Log job-related event
     */
    job: (jobId: string, event: string, context: LogContext = {}) => {
        log('info', `Job ${event}`, { jobId, ...context });
    },

    /**
     * Log API error with full context
     */
    apiError: (endpoint: string, error: Error, context: LogContext = {}) => {
        log('error', `API Error: ${endpoint}`, context, error);
    },

    /**
     * Get recent logs (for debugging)
     */
    getRecentLogs: (count = 100, level?: LogLevel): LogEntry[] => {
        let logs = logBuffer.slice(-count);
        if (level) {
            logs = logs.filter(l => l.level === level);
        }
        return logs;
    },

    /**
     * Get logs for a specific job
     */
    getJobLogs: (jobId: string): LogEntry[] => {
        return logBuffer.filter(l => l.context.jobId === jobId);
    },

    /**
     * Get error count in last N minutes
     */
    getErrorCount: (minutes = 5): number => {
        const since = Date.now() - (minutes * 60 * 1000);
        return logBuffer.filter(
            l => l.level === 'error' && new Date(l.timestamp).getTime() > since
        ).length;
    },
};

export default logger;
