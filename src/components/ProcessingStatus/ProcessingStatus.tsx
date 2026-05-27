'use client';

import { useState, useEffect } from 'react';
import styles from './ProcessingStatus.module.css';

export type JobStatus = 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';

interface ProcessingStatusProps {
    jobId: string;
    onComplete?: (downloadUrl: string) => void;
    onError?: (error: string) => void;
}

export function ProcessingStatus({ jobId, onComplete, onError }: ProcessingStatusProps) {
    const [status, setStatus] = useState<JobStatus>('pending');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!jobId) return;

        let isPolling = true;
        let timeoutId: NodeJS.Timeout;
        const abortController = new AbortController();

        const pollStatus = async () => {
            if (!isPolling || !jobId) return;

            try {
                const response = await fetch(`/api/jobs/${jobId}`, {
                    signal: abortController.signal
                });
                
                if (!isPolling) return; // Prevent updates if unmounted during fetch
                
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to get status');
                }

                setStatus(data.state);
                setProgress(data.progress || 0);

                if (data.state === 'completed' && data.downloadUrl) {
                    setDownloadUrl(data.downloadUrl);
                    onComplete?.(data.downloadUrl);
                    isPolling = false; // Stop polling
                } else if (data.state === 'failed') {
                    setError(data.error || 'Processing failed');
                    onError?.(data.error);
                    isPolling = false; // Stop polling
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log('Polling aborted cleanly');
                    return;
                }
                console.error('Status poll error:', err);
            }

            if (isPolling) {
                timeoutId = setTimeout(pollStatus, 1000);
            }
        };

        // Initial poll
        pollStatus();

        return () => {
            isPolling = false;
            clearTimeout(timeoutId);
            abortController.abort(); // Cancel any pending network requests immediately
        };
    }, [jobId, onComplete, onError]);

    const getStatusMessage = () => {
        switch (status) {
            case 'pending':
                return 'Preparing...';
            case 'uploading':
                return 'Uploading file...';
            case 'queued':
                return 'In queue...';
            case 'processing':
                return 'Processing...';
            case 'completed':
                return 'Complete!';
            case 'failed':
                return 'Failed';
            default:
                return 'Unknown status';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'completed':
                return '✅';
            case 'failed':
                return '❌';
            default:
                return null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.statusCard}>
                {status !== 'completed' && status !== 'failed' && (
                    <div className={styles.spinner} />
                )}

                {getStatusIcon() && (
                    <span className={styles.statusIcon}>{getStatusIcon()}</span>
                )}

                <div className={styles.info}>
                    <h3 className={styles.statusText}>{getStatusMessage()}</h3>

                    {status === 'processing' && (
                        <div className={styles.progressWrapper}>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className={styles.progressText}>{Math.round(progress)}%</span>
                        </div>
                    )}

                    {error && (
                        <p className={styles.errorText}>{error}</p>
                    )}
                </div>

                {status === 'completed' && downloadUrl && (
                    <a
                        href={downloadUrl}
                        download
                        className={styles.downloadButton}
                    >
                        <span>📥</span>
                        Download
                    </a>
                )}
            </div>

            {status !== 'completed' && status !== 'failed' && (
                <p className={styles.privacyNote}>
                    🔒 Your file will be automatically deleted after processing
                </p>
            )}
        </div>
    );
}

export default ProcessingStatus;
