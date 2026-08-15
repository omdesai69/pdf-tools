import { pdfProcessor, PDFOperation, OperationOptions } from './pdfProcessor';
import { jobManager } from '../jobs/stateMachine';

export type QueuePriority = 'high' | 'normal' | 'low';

export interface QueuedJob {
    jobId: string;
    operation: PDFOperation;
    options: OperationOptions;
    priority: QueuePriority;
    enqueuedAt: number;
    attempts: number;
    maxAttempts: number;
}

/**
 * In-memory job queue with priorities
 * (Use BullMQ with Redis in production)
 */
class JobQueue {
    private queues: Map<QueuePriority, QueuedJob[]>;
    private processing: Map<string, boolean>;
    private maxConcurrent: number;
    private isProcessing: boolean;

    constructor(maxConcurrent: number = 5) {
        this.queues = new Map([
            ['high', []],
            ['normal', []],
            ['low', []],
        ]);
        this.processing = new Map();
        this.maxConcurrent = maxConcurrent;
        this.isProcessing = false;
    }

    /**
     * Determine priority based on file size and operation
     */
    private determinePriority(fileSize: number, operation: PDFOperation): QueuePriority {
        // Multi-file operations get low priority
        const lowPriorityOps: PDFOperation[] = ['merge', 'alternate-mix', 'image-to-pdf'];
        if (lowPriorityOps.includes(operation)) {
            return 'low';
        }

        // Small files get high priority (< 5MB)
        if (fileSize < 5 * 1024 * 1024) {
            return 'high';
        }

        // Medium files get normal priority (< 50MB)
        if (fileSize < 50 * 1024 * 1024) {
            return 'normal';
        }

        // Large files get low priority
        return 'low';
    }

    /**
     * Add job to queue
     */
    async enqueue(
        jobId: string,
        operation: PDFOperation,
        options: OperationOptions = {},
        fileSize: number = 0
    ): Promise<{ position: number; priority: QueuePriority }> {
        const priority = this.determinePriority(fileSize, operation);

        const job: QueuedJob = {
            jobId,
            operation,
            options,
            priority,
            enqueuedAt: Date.now(),
            attempts: 0,
            maxAttempts: 3,
        };

        const queue = this.queues.get(priority)!;
        queue.push(job);

        // Update job state
        await jobManager.transition(jobId, 'queued');

        // Start processing if not already running
        this.processQueue();

        return {
            position: queue.length,
            priority,
        };
    }

    /**
     * Process jobs from queues
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Process jobs up to max capacity safely (no while(true) infinite loops)
            while (this.processing.size < this.maxConcurrent) {
                // Get next job (priority order)
                const job = this.getNextJob();
                if (!job) break;

                // Mark as processing
                this.processing.set(job.jobId, true);

                // Process async (don't await) and chain cleanly without recursive setTimeout
                this.processJob(job).finally(() => {
                    this.processing.delete(job.jobId);
                    
                    // Lazy promise chaining instead of immortal setTimeout daemons
                    // This is HMR-safe because it relies on standard Promise resolution, not detached timers.
                    queueMicrotask(() => {
                        if (!this.isProcessing) {
                            this.processQueue();
                        }
                    });
                }).catch(console.error);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get next job from queues (priority order)
     */
    private getNextJob(): QueuedJob | null {
        for (const priority of ['high', 'normal', 'low'] as QueuePriority[]) {
            const queue = this.queues.get(priority)!;
            if (queue.length > 0) {
                return queue.shift()!;
            }
        }
        return null;
    }

    /**
     * Process a single job
     */
    private async processJob(job: QueuedJob): Promise<void> {
        job.attempts++;

        try {
            await pdfProcessor.process(job.jobId, job.operation, job.options);
        } catch (error) {
            console.error(`Job ${job.jobId} failed:`, error);

            // Retry if under max attempts
            if (job.attempts < job.maxAttempts) {
                const queue = this.queues.get(job.priority)!;
                queue.push(job); // Re-queue
            } else {
                await jobManager.transition(job.jobId, 'failed', {
                    error: `Max retries exceeded after ${job.attempts} attempts`,
                });
            }
        }
    }

    /**
     * Get queue stats
     */
    getStats(): {
        queued: Record<QueuePriority, number>;
        processing: number;
    } {
        return {
            queued: {
                high: this.queues.get('high')!.length,
                normal: this.queues.get('normal')!.length,
                low: this.queues.get('low')!.length,
            },
            processing: this.processing.size,
        };
    }

    /**
     * Cancel a queued job
     */
    async cancel(jobId: string): Promise<boolean> {
        for (const queue of this.queues.values()) {
            const index = queue.findIndex((j) => j.jobId === jobId);
            if (index !== -1) {
                queue.splice(index, 1);
                await jobManager.transition(jobId, 'cancelled');
                return true;
            }
        }
        return false;
    }
}

// HMR Safe Singleton (prevents duplicate queues on hot reload)
const globalQueue = globalThis as any;
if (!globalQueue._jobQueue) {
    // Restrict to 1 concurrent job to prevent pdf-lib from eating all RAM during parsing
    // pdf-lib object models take 5-10x the size of the PDF file in RAM
    globalQueue._jobQueue = new JobQueue(1);
}
export const jobQueue: JobQueue = globalQueue._jobQueue;
