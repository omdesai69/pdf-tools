'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import styles from './VisualPageGrid.module.css';

export interface VisualPageItem {
    id: string;
    originalIndex: number; // 0-based
    displayIndex: number;  // current order (1-based)
    rotation: number;      // 0, 90, 180, 270
    isDeleted: boolean;
    isSelected: boolean;
    thumbnailUrl?: string;
}

interface VisualPageGridProps {
    file: File;
    toolId: string;
    onChange?: (state: {
        pageOrder: number[];      // 1-based original indices in current order
        rotations: Record<number, number>; // originalIndex -> rotation angle
        selectedPages: number[];  // 1-based original indices
        deletedPages: number[];   // 1-based original indices
    }) => void;
}

export const VisualPageGrid: React.FC<VisualPageGridProps> = ({ file, toolId, onChange }) => {
    const [pages, setPages] = useState<VisualPageItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const pdfDocRef = useRef<any>(null);

    // Notify parent whenever pages state changes
    const emitChange = useCallback((items: VisualPageItem[]) => {
        if (!onChange) return;
        const activeItems = items.filter(p => !p.isDeleted);
        
        const pageOrder = activeItems.map(p => p.originalIndex + 1);
        const rotations: Record<number, number> = {};
        const selectedPages = items.filter(p => p.isSelected && !p.isDeleted).map(p => p.originalIndex + 1);
        const deletedPages = items.filter(p => p.isDeleted).map(p => p.originalIndex + 1);

        items.forEach(p => {
            if (p.rotation !== 0) {
                rotations[p.originalIndex + 1] = p.rotation;
            }
        });

        onChange({
            pageOrder,
            rotations,
            selectedPages,
            deletedPages,
        });
    }, [onChange]);

    // Load PDF and render thumbnails
    useEffect(() => {
        let isMounted = true;

        async function loadPdfThumbnails() {
            setLoading(true);
            try {
                const pdfjsLib = await import('pdfjs-dist');
                // Use reliable CDN worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                pdfDocRef.current = pdf;

                const numPages = pdf.numPages;
                const initialItems: VisualPageItem[] = [];

                for (let i = 1; i <= numPages; i++) {
                    initialItems.push({
                        id: `page-${i}-${Date.now()}`,
                        originalIndex: i - 1,
                        displayIndex: i,
                        rotation: 0,
                        isDeleted: false,
                        isSelected: true,
                    });
                }

                if (isMounted) {
                    setPages(initialItems);
                    emitChange(initialItems);
                }

                // Render thumbnails sequentially in background
                for (let i = 1; i <= numPages; i++) {
                    if (!isMounted) break;
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.4 });
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    if (ctx) {
                        await page.render({ canvasContext: ctx, viewport }).promise;
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                        if (isMounted) {
                            setPages(prev =>
                                prev.map((p, idx) => (idx === i - 1 ? { ...p, thumbnailUrl: dataUrl } : p))
                            );
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load visual PDF thumbnails:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (file && file.type === 'application/pdf') {
            loadPdfThumbnails();
        }

        return () => {
            isMounted = false;
        };
    }, [file, emitChange]);

    // Page Actions
    const handleRotate = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPages(prev => {
            const updated = prev.map(p =>
                p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
            );
            emitChange(updated);
            return updated;
        });
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPages(prev => {
            const updated = prev.map(p => (p.id === id ? { ...p, isDeleted: !p.isDeleted } : p));
            emitChange(updated);
            return updated;
        });
    };

    const handleToggleSelect = (id: string) => {
        setPages(prev => {
            const updated = prev.map(p => (p.id === id ? { ...p, isSelected: !p.isSelected } : p));
            emitChange(updated);
            return updated;
        });
    };

    const handleRotateAll = () => {
        setPages(prev => {
            const updated = prev.map(p => ({ ...p, rotation: (p.rotation + 90) % 360 }));
            emitChange(updated);
            return updated;
        });
    };

    const handleReset = () => {
        setPages(prev => {
            const reset = [...prev]
                .sort((a, b) => a.originalIndex - b.originalIndex)
                .map(p => ({ ...p, rotation: 0, isDeleted: false, isSelected: true }));
            emitChange(reset);
            return reset;
        });
    };

    // Drag and Drop
    const handleDragStart = (id: string) => {
        setDraggedId(id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (dragOverId !== id) {
            setDragOverId(id);
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        setPages(prev => {
            const items = [...prev];
            const draggedIdx = items.findIndex(p => p.id === draggedId);
            const targetIdx = items.findIndex(p => p.id === targetId);

            if (draggedIdx === -1 || targetIdx === -1) return prev;

            const [removed] = items.splice(draggedIdx, 1);
            items.splice(targetIdx, 0, removed);

            emitChange(items);
            return items;
        });

        setDraggedId(null);
        setDragOverId(null);
    };

    const activeCount = pages.filter(p => !p.isDeleted).length;

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.stats}>
                    <span>Visual Page Studio</span>
                    <span className={styles.badge}>{activeCount} of {pages.length} Pages Active</span>
                </div>
                <div className={styles.actions}>
                    <button type="button" className={styles.toolBtn} onClick={handleRotateAll}>
                        🔄 Rotate All 90°
                    </button>
                    <button type="button" className={styles.toolBtn} onClick={handleReset}>
                        ↺ Reset
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className={styles.grid}>
                {pages.map((item, index) => {
                    const isDragging = draggedId === item.id;
                    const isDragOver = dragOverId === item.id;

                    return (
                        <div
                            key={item.id}
                            draggable={!item.isDeleted}
                            onDragStart={() => handleDragStart(item.id)}
                            onDragOver={(e) => handleDragOver(e, item.id)}
                            onDrop={(e) => handleDrop(e, item.id)}
                            onClick={() => handleToggleSelect(item.id)}
                            className={`
                                ${styles.card} 
                                ${isDragging ? styles.dragging : ''} 
                                ${isDragOver ? styles.dragOver : ''} 
                                ${item.isDeleted ? styles.deleted : ''}
                                ${item.isSelected && !item.isDeleted ? styles.selected : ''}
                            `}
                        >
                            {/* Header pills */}
                            <div className={styles.pageHeader}>
                                <span className={styles.pagePill}>#{index + 1}</span>
                                {item.rotation > 0 && (
                                    <span className={styles.pagePill}>{item.rotation}°</span>
                                )}
                            </div>

                            {/* Thumbnail */}
                            <div className={styles.previewWrapper}>
                                {item.thumbnailUrl ? (
                                    <img
                                        src={item.thumbnailUrl}
                                        alt={`Page ${item.originalIndex + 1}`}
                                        className={styles.thumbnailImg}
                                        style={{ transform: `rotate(${item.rotation}deg)` }}
                                    />
                                ) : (
                                    <div className={styles.loadingSkeleton}>
                                        {loading ? 'Rendering...' : `Page ${item.originalIndex + 1}`}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className={styles.cardActions}>
                                <button
                                    type="button"
                                    title="Rotate page 90°"
                                    className={styles.actionIconBtn}
                                    onClick={(e) => handleRotate(item.id, e)}
                                    disabled={item.isDeleted}
                                >
                                    🔄
                                </button>
                                <button
                                    type="button"
                                    title={item.isDeleted ? 'Restore page' : 'Delete page'}
                                    className={`${styles.actionIconBtn} ${item.isDeleted ? styles.restoreBtn : styles.deleteBtn}`}
                                    onClick={(e) => handleDelete(item.id, e)}
                                >
                                    {item.isDeleted ? '↩️' : '🗑️'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
