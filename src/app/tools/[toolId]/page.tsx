'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getToolById, isToolActive } from '@/lib/tools';
import { getToolConfig, type ToolSettings, type SettingsField } from '@/lib/toolSettings';
import {
    addRecentTool,
    addRecentFile,
    validateFileSize,
    validateFileType,
    formatFileSize
} from '@/lib/storage';
import styles from './page.module.css';

type Stage = 'upload' | 'settings' | 'processing' | 'complete' | 'error';
type ProcessingStep = 'preparing' | 'uploading' | 'processing' | 'finalizing';

export default function ToolPage() {
    const params = useParams();
    const router = useRouter();
    const toolId = params.toolId as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [stage, setStage] = useState<Stage>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [fileAccepted, setFileAccepted] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [settings, setSettings] = useState<ToolSettings>({});
    const [jobId, setJobId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [processingStep, setProcessingStep] = useState<string>('');
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

    // Handle unmounting safely for polling loops
    const mounted = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const tool = getToolById(toolId);
    const toolConfig = getToolConfig(toolId);

    // Track tool usage
    useEffect(() => {
        if (tool) {
            addRecentTool({ id: tool.id, name: tool.name, icon: tool.icon });
        }
    }, [tool]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort(); // Cancel pending network requests instantly
            }
        };
    }, []);

    // Initialize default settings
    useEffect(() => {
        if (toolConfig.settingsFields) {
            const defaults: ToolSettings = {};
            toolConfig.settingsFields.forEach(field => {
                if (field.default !== undefined) {
                    (defaults as Record<string, unknown>)[field.key] = field.default;
                }
            });
            setSettings(defaults);
        }
    }, [toolConfig]);

    const handleFiles = useCallback((fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;

        const newFiles: File[] = [];
        const errors: string[] = [];

        // Determine accepted MIME types based on tool
        const acceptedTypes = toolId === 'image-to-pdf'
            ? ['image/jpeg', 'image/png', 'image/jpg']
            : ['application/pdf'];

        Array.from(fileList).forEach(file => {
            // Validate type
            const typeCheck = validateFileType(file, acceptedTypes);
            if (!typeCheck.valid) {
                errors.push(`${file.name}: ${typeCheck.message}`);
                return;
            }

            // Validate size
            const sizeCheck = validateFileSize(file.size);
            if (!sizeCheck.valid) {
                errors.push(`${file.name}: ${sizeCheck.message}`);
                return;
            }

            newFiles.push(file);
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
            setStage('error');
            return;
        }

        // Show file accepted feedback
        setFileAccepted(true);
        setFiles(newFiles);

        // Brief delay to show acceptance, then proceed
        setTimeout(() => {
            setFileAccepted(false);
            // If tool has settings or multiple files are uploaded (for reordering), show settings panel
            if ((toolConfig.hasSettings && toolConfig.settingsFields) || newFiles.length > 1) {
                setStage('settings');
            } else {
                // Otherwise proceed to processing
                processFiles(newFiles);
            }
        }, 400);
    }, [toolConfig]);

    const processFiles = async (filesToProcess: File[]) => {
        setStage('processing');
        setProgress(0);
        setProcessingStep('preparing');

        try {
            // Step 1: Create job
            const createRes = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: toolId,
                    settings
                }),
            });

            if (!createRes.ok) throw new Error('Failed to create job');
            const { jobId: newJobId } = await createRes.json();
            setJobId(newJobId);
            setProgress(10);
            setProcessingStep('uploading');

            // Step 2: Upload files
            const formData = new FormData();
            filesToProcess.forEach(file => formData.append('files', file));

            const uploadRes = await fetch(`/api/jobs/${newJobId}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) throw new Error('Upload failed');
            setProgress(30);
            setProcessingStep('processing');

            // Step 3: Start processing
            const processRes = await fetch(`/api/jobs/${newJobId}/process`, {
                method: 'POST',
            });

            const processData = await processRes.json();

            if (!processRes.ok) {
                throw new Error(processData.message || 'Failed to start processing');
            }

            // If processing completed immediately (synchronous serverless execution)
            if (processData.status === 'COMPLETED') {
                setProgress(100);
                setProcessingStep('finalizing');

                filesToProcess.forEach(file => {
                    addRecentFile({
                        name: file.name,
                        size: file.size,
                        toolId,
                        toolName: tool?.name || toolId,
                        jobId: newJobId,
                    });
                });

                setTimeout(() => {
                    if (mounted.current) setStage('complete');
                }, 200);
                return;
            }

            setProgress(40);

            // Step 4: Poll for completion (fallback for async/background jobs)
            let isPolling = true;
            let timeoutId: NodeJS.Timeout;
            
            // Create a new abort controller for this specific polling job
            abortControllerRef.current = new AbortController();
            
            const pollStatus = async () => {
                if (!isPolling || !mounted.current) return;
                
                try {
                    const statusRes = await fetch(`/api/jobs/${newJobId}?t=${Date.now()}`, {
                        signal: abortControllerRef.current?.signal,
                        cache: 'no-store',
                    });
                    
                    if (!mounted.current || !isPolling) return;
                    
                    const status = await statusRes.json();

                    if (status.state === 'completed') {
                        isPolling = false;
                        if (!mounted.current) return;
                        setProcessingStep('finalizing');
                        setProgress(100);

                        filesToProcess.forEach(file => {
                            addRecentFile({
                                name: file.name,
                                size: file.size,
                                toolId,
                                toolName: tool?.name || toolId,
                                jobId: newJobId,
                            });
                        });

                        setTimeout(() => {
                            if (mounted.current) setStage('complete');
                        }, 200);
                        return;
                    } else if (status.state === 'failed') {
                        isPolling = false;
                        if (!mounted.current) return;
                        setError(status.error || 'Processing failed');
                        setStage('error');
                        return;
                    } else if (status.state === 'processing') {
                        if (!mounted.current) return;
                        // Update progress based on backend progress
                        const backendProgress = status.progress || 0;
                        setProgress(40 + (backendProgress * 0.55)); // 40-95%
                        // Update step text based on progress
                        if (backendProgress > 80) {
                            setProcessingStep('finalizing');
                        }
                    }
                } catch (pollError: any) {
                    if (pollError.name === 'AbortError') {
                        console.log('Polling aborted cleanly');
                        return;
                    }
                    console.error('Poll error:', pollError);
                }
                
                // Schedule next poll only after this one completes
                if (isPolling && mounted.current) {
                    timeoutId = setTimeout(pollStatus, 500);
                }
            };
            
            // Start polling
            pollStatus();

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStage('error');
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleSettingChange = (key: keyof ToolSettings, value: string | number) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setStage('upload');
        setFiles([]);
        setError(null);
        setJobId(null);
        setProgress(0);
    };

    const handleSort = (dragIndex: number, hoverIndex: number) => {
        setFiles((prevFiles) => {
            const newFiles = [...prevFiles];
            const draggedItem = newFiles[dragIndex];
            newFiles.splice(dragIndex, 1);
            newFiles.splice(hoverIndex, 0, draggedItem);
            return newFiles;
        });
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const renderSettingsField = (field: SettingsField) => {
        const value = settings[field.key] ?? field.default;

        switch (field.type) {
            case 'select':
                return (
                    <select
                        className={styles.select}
                        value={value as string}
                        onChange={(e) => handleSettingChange(field.key, e.target.value)}
                    >
                        {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            case 'text':
                return (
                    <input
                        type="text"
                        className={styles.input}
                        value={value as string}
                        placeholder={field.placeholder}
                        onChange={(e) => handleSettingChange(field.key, e.target.value)}
                    />
                );
            case 'range':
                return (
                    <div className={styles.rangeWrapper}>
                        <input
                            type="range"
                            className={styles.range}
                            min={field.min}
                            max={field.max}
                            value={value as number}
                            onChange={(e) => handleSettingChange(field.key, parseInt(e.target.value))}
                        />
                        <span className={styles.rangeValue}>{value}%</span>
                    </div>
                );
            default:
                return null;
        }
    };

    if (!tool) {
        return (
            <div className={styles.page}>
                <div className={styles.center}>
                    <p className={styles.error}>Tool not found</p>
                    <button className={styles.link} onClick={() => router.push('/')}>
                        ← Back to tools
                    </button>
                </div>
            </div>
        );
    }

    // Handle hidden/unavailable tools gracefully
    if (!isToolActive(toolId)) {
        return (
            <div className={styles.page}>
                <nav className={styles.nav}>
                    <div className={styles.navContent}>
                        <button className={styles.backButton} onClick={() => router.push('/')}>
                            ← Back
                        </button>
                        <span className={styles.toolTitle}>{tool.icon} {tool.name}</span>
                    </div>
                </nav>
                <main className={styles.main}>
                    <div className={styles.errorContainer}>
                        <div className={styles.errorIcon}>🔧</div>
                        <p className={styles.errorText}>
                            This tool is currently unavailable.
                        </p>
                        <p className={styles.errorHint}>
                            We're working on bringing this feature to you soon. In the meantime, check out our other tools!
                        </p>
                        <button className={styles.resetBtn} onClick={() => router.push('/')}>
                            Browse available tools
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <button className={styles.backButton} onClick={() => router.push('/')}>
                        ← Back
                    </button>
                    <span className={styles.toolTitle}>{tool.icon} {tool.name}</span>
                </div>
            </nav>

            <main className={styles.main}>
                {/* Upload Stage */}
                {stage === 'upload' && (
                    <div className={styles.uploadContainer}>
                        <div className={styles.header}>
                            <h1 className={styles.title}>{tool.name}</h1>
                            <p className={styles.subtitle}>{tool.description}</p>
                        </div>

                        <div
                            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${fileAccepted ? styles.fileAccepted : ''}`}
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={toolId === 'image-to-pdf' ? '.jpg,.jpeg,.png' : '.pdf'}
                                multiple={toolConfig.acceptMultiple}
                                onChange={(e) => handleFiles(e.target.files)}
                                className={styles.fileInput}
                            />
                            <div className={styles.dropContent}>
                                <div className={styles.dropIcon}>
                                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                                        <path d="M24 8v24M16 16l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8 32v8a4 4 0 004 4h24a4 4 0 004-4v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <p className={styles.dropText}>
                                    {toolId === 'image-to-pdf'
                                        ? 'Drop images here'
                                        : (toolConfig.acceptMultiple ? 'Drop PDFs here' : 'Drop PDF here')}
                                </p>
                                <p className={styles.dropHint}>
                                    or click to browse • Max 10 MB
                                    {toolId === 'image-to-pdf' && ' • JPG, PNG'}
                                </p>
                            </div>
                        </div>

                        {/* Trust signals */}
                        <div className={styles.trustSignals}>
                            <div className={styles.trustItem}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span>Files are automatically deleted after processing</span>
                            </div>
                            <div className={styles.trustItem}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                <span>No signup required • Privacy first</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Stage */}
                {stage === 'settings' && (
                    <div className={styles.settingsContainer}>
                        <div className={styles.header}>
                            <h1 className={styles.title}>Settings</h1>
                            <p className={styles.subtitle}>
                                {files.length} file{files.length > 1 ? 's' : ''} selected • {formatFileSize(files.reduce((s, f) => s + f.size, 0))}
                            </p>
                        </div>

                        {files.length > 1 && (
                            <div className={styles.fileList}>
                                {files.map((file, index) => (
                                    <div 
                                        key={`${file.name}-${index}`}
                                        className={`${styles.fileItem} ${draggedItemIndex === index ? styles.dragging : ''} ${dragOverItemIndex === index ? styles.dragOver : ''}`}
                                        draggable
                                        onDragStart={() => setDraggedItemIndex(index)}
                                        onDragEnter={() => setDragOverItemIndex(index)}
                                        onDragEnd={() => {
                                            if (draggedItemIndex !== null && dragOverItemIndex !== null && draggedItemIndex !== dragOverItemIndex) {
                                                handleSort(draggedItemIndex, dragOverItemIndex);
                                            }
                                            setDraggedItemIndex(null);
                                            setDragOverItemIndex(null);
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        <div className={styles.dragHandle}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="9" cy="12" r="1"></circle>
                                                <circle cx="9" cy="5" r="1"></circle>
                                                <circle cx="9" cy="19" r="1"></circle>
                                                <circle cx="15" cy="12" r="1"></circle>
                                                <circle cx="15" cy="5" r="1"></circle>
                                                <circle cx="15" cy="19" r="1"></circle>
                                            </svg>
                                        </div>
                                        <div className={styles.fileInfo}>
                                            <span className={styles.fileName}>{file.name}</span>
                                            <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                                        </div>
                                        <button 
                                            className={styles.removeBtn} 
                                            onClick={() => handleRemoveFile(index)}
                                            title="Remove file"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {toolConfig.hasSettings && toolConfig.settingsFields && (
                            <div className={styles.settingsPanel}>
                                {toolConfig.settingsFields.map(field => (
                                    <div key={field.key} className={styles.settingsField}>
                                        <label className={styles.label}>{field.label}</label>
                                        {renderSettingsField(field)}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.settingsActions}>
                            <button
                                className={styles.secondaryBtn}
                                onClick={handleReset}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.primaryBtn}
                                onClick={() => processFiles(files)}
                            >
                                Process
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing Stage - Step-based feedback */}
                {stage === 'processing' && (
                    <div className={styles.processing}>
                        <div className={styles.progressRing}>
                            <svg width="100" height="100" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    opacity="0.15"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="var(--color-accent)"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={283}
                                    strokeDashoffset={283 - (283 * progress / 100)}
                                    className={styles.progressCircle}
                                />
                            </svg>
                            <span className={styles.progressText}>{Math.round(progress)}%</span>
                        </div>
                        <p className={styles.processingText}>
                            {processingStep === 'preparing' && 'Preparing file…'}
                            {processingStep === 'uploading' && 'Uploading…'}
                            {processingStep === 'processing' && 'Processing pages…'}
                            {processingStep === 'finalizing' && 'Finalizing output…'}
                        </p>
                        <p className={styles.processingFile}>
                            {files.map(f => f.name).join(', ')}
                        </p>
                    </div>
                )}

                {/* Complete Stage */}
                {stage === 'complete' && (
                    <div className={styles.complete}>
                        <div className={styles.successIcon}>
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="30" stroke="var(--color-success)" strokeWidth="2" />
                                <path
                                    d="M20 32l8 8 16-16"
                                    stroke="var(--color-success)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={styles.checkPath}
                                />
                            </svg>
                        </div>
                        <p className={styles.completeText}>Done!</p>
                        <div className={styles.actions}>
                            <a
                                href={`/api/jobs/${jobId}/download`}
                                download
                                className={styles.downloadBtn}
                            >
                                Download
                            </a>
                            <button className={styles.resetBtn} onClick={handleReset}>
                                Process another
                            </button>
                        </div>
                        <p className={styles.downloadNotice}>
                            Your file will be automatically deleted shortly after download
                        </p>
                    </div>
                )}

                {/* Error Stage - Human-friendly messages */}
                {stage === 'error' && (
                    <div className={styles.errorContainer}>
                        <div className={styles.errorIcon}>
                            {error?.includes('limit') || error?.includes('Limit') ? '⏰' :
                                error?.includes('expired') || error?.includes('EXPIRED') ? '🔒' : '💡'}
                        </div>
                        <p className={styles.errorText}>
                            {error?.includes('expired') || error?.includes('EXPIRED')
                                ? 'This file has expired to protect your privacy. Please upload again.'
                                : error?.includes('limit') || error?.includes('Limit')
                                    ? "You've reached today's free limit. This helps keep the service reliable for everyone."
                                    : error?.includes('timeout') || error?.includes('Timeout')
                                        ? 'This file took longer than expected. Try a smaller file or check your connection.'
                                        : error?.includes('Unsupported')
                                            ? 'This feature is coming soon. Try one of our other tools!'
                                            : error || 'Something went wrong. Your files are safe - please try again.'}
                        </p>
                        <p className={styles.errorHint}>
                            {error?.includes('limit') || error?.includes('Limit')
                                ? 'Limits reset daily. No signup required to try again tomorrow.'
                                : 'No data was stored. You can safely upload again.'}
                        </p>
                        <button className={styles.resetBtn} onClick={handleReset}>
                            Try again
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
