'use client';

import { useState, useRef, useCallback } from 'react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // in bytes
    onFilesSelected: (files: File[]) => void;
    isUploading?: boolean;
    uploadProgress?: number;
}

export function FileUpload({
    accept = '.pdf',
    multiple = false,
    maxSize = 100 * 1024 * 1024, // 100MB default
    onFilesSelected,
    isUploading = false,
    uploadProgress = 0,
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFiles = useCallback(
        (files: FileList | File[]): File[] => {
            const validFiles: File[] = [];
            const fileArray = Array.from(files);

            for (const file of fileArray) {
                if (file.size > maxSize) {
                    setError(`File "${file.name}" exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
                    continue;
                }
                validFiles.push(file);
            }

            return validFiles;
        },
        [maxSize]
    );

    const handleFiles = useCallback(
        (files: FileList | File[]) => {
            setError(null);
            const validFiles = validateFiles(files);
            if (validFiles.length > 0) {
                onFilesSelected(validFiles);
            }
        },
        [validateFiles, onFilesSelected]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) {
                handleFiles(e.target.files);
            }
        },
        [handleFiles]
    );

    return (
        <div className={styles.wrapper}>
            <div
                className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.uploading : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleInputChange}
                    className={styles.input}
                />

                {isUploading ? (
                    <div className={styles.uploadingContent}>
                        <div className={styles.spinner} />
                        <p className={styles.uploadText}>Uploading... {Math.round(uploadProgress)}%</p>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.iconWrapper}>
                            <span className={styles.icon}>📄</span>
                        </div>
                        <p className={styles.mainText}>
                            Drop your PDF here, or <span className={styles.highlight}>browse</span>
                        </p>
                        <p className={styles.subText}>
                            Maximum file size: {Math.round(maxSize / 1024 / 1024)}MB
                        </p>
                    </>
                )}

                <div className={`${styles.glow} ${isDragging ? styles.glowActive : ''}`} />
            </div>

            {error && (
                <div className={styles.error}>
                    <span>⚠️</span> {error}
                </div>
            )}
        </div>
    );
}

export default FileUpload;
