'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SignatureModal } from './SignatureModal';
import styles from './SignOverlay.module.css';

interface SignOverlayProps {
    file: File;
    onChange?: (signatureData: {
        signatureDataUrl: string;
        signaturePage: number;
        signatureX: number;     // Normalized 0 to 1
        signatureY: number;     // Normalized 0 to 1
        signatureWidth: number; // Normalized 0 to 1
        signatureHeight: number;// Normalized 0 to 1
    }) => void;
}

export const SignOverlay: React.FC<SignOverlayProps> = ({ file, onChange }) => {
    const [numPages, setNumPages] = useState<number>(1);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

    // Signature box position in pixels on current viewport
    const [box, setBox] = useState<{ x: number; y: number; width: number; height: number }>({
        x: 50,
        y: 100,
        width: 160,
        height: 80,
    });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
    });

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const pdfDocRef = useRef<any>(null);

    // Render current PDF page
    const renderPage = useCallback(async (pageNum: number) => {
        if (!pdfDocRef.current || !canvasRef.current) return;
        try {
            const page = await pdfDocRef.current.getPage(pageNum);
            const stageWidth = stageRef.current ? Math.min(stageRef.current.parentElement?.clientWidth || 600, 600) : 600;
            const unscaledViewport = page.getViewport({ scale: 1 });
            const scale = stageWidth / unscaledViewport.width;
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (ctx) {
                await page.render({ canvasContext: ctx, viewport }).promise;
            }
        } catch (err) {
            console.error('Failed to render PDF page for signing:', err);
        }
    }, []);

    // Load PDF
    useEffect(() => {
        let isMounted = true;
        async function loadPdf() {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                if (!isMounted) return;

                pdfDocRef.current = pdf;
                setNumPages(pdf.numPages);
                renderPage(1);
            } catch (err) {
                console.error('Failed to load PDF for signing:', err);
            }
        }

        if (file && file.type === 'application/pdf') {
            loadPdf();
        }

        return () => {
            isMounted = false;
        };
    }, [file, renderPage]);

    useEffect(() => {
        renderPage(currentPage);
    }, [currentPage, renderPage]);

    // Emit signature change to parent
    const notifyChange = useCallback((url: string, currentBox: typeof box) => {
        if (!onChange || !canvasRef.current) return;
        const stageW = canvasRef.current.width || 600;
        const stageH = canvasRef.current.height || 800;

        onChange({
            signatureDataUrl: url,
            signaturePage: currentPage,
            signatureX: currentBox.x / stageW,
            signatureY: (stageH - (currentBox.y + currentBox.height)) / stageH, // PDF coordinates start from bottom-left
            signatureWidth: currentBox.width / stageW,
            signatureHeight: currentBox.height / stageH,
        });
    }, [onChange, currentPage]);

    const handleSignatureAdopted = (dataUrl: string) => {
        setSignatureUrl(dataUrl);
        notifyChange(dataUrl, box);
    };

    // Drag handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: box.x,
            initialY: box.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !canvasRef.current) return;
        const dx = e.clientX - dragStartRef.current.startX;
        const dy = e.clientY - dragStartRef.current.startY;

        const maxW = canvasRef.current.width - box.width;
        const maxH = canvasRef.current.height - box.height;

        const nextX = Math.max(0, Math.min(maxW, dragStartRef.current.initialX + dx));
        const nextY = Math.max(0, Math.min(maxH, dragStartRef.current.initialY + dy));

        const updatedBox = { ...box, x: nextX, y: nextY };
        setBox(updatedBox);
        if (signatureUrl) notifyChange(signatureUrl, updatedBox);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    };

    return (
        <div className={styles.container}>
            {/* Top Bar Navigation */}
            <div className={styles.topBar}>
                <div className={styles.pageNav}>
                    <button
                        type="button"
                        className={styles.navBtn}
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        ← Prev
                    </button>
                    <span>Page {currentPage} of {numPages}</span>
                    <button
                        type="button"
                        className={styles.navBtn}
                        disabled={currentPage >= numPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Next →
                    </button>
                </div>

                <button
                    type="button"
                    className={styles.signActionBtn}
                    onClick={() => setIsModalOpen(true)}
                >
                    ✍️ {signatureUrl ? 'Change Signature' : 'Add Signature'}
                </button>
            </div>

            {/* Document Stage with Drag Overlay */}
            <div ref={stageRef} className={styles.documentStage}>
                <canvas ref={canvasRef} className={styles.pageCanvas} />

                {signatureUrl && (
                    <div
                        className={`${styles.signatureBox} ${isDragging ? styles.dragging : ''}`}
                        style={{
                            left: `${box.x}px`,
                            top: `${box.y}px`,
                            width: `${box.width}px`,
                            height: `${box.height}px`,
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        <img src={signatureUrl} alt="Signature" className={styles.signatureImg} />
                        <button
                            type="button"
                            className={styles.removeSigBtn}
                            onClick={() => setSignatureUrl(null)}
                            title="Remove"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            <p className={styles.hint}>
                {signatureUrl
                    ? '💡 Drag the signature box to place it exactly where you want to sign.'
                    : 'Click "Add Signature" to draw or type your signature.'}
            </p>

            {/* Signature Creation Modal */}
            <SignatureModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSignatureAdopted}
            />
        </div>
    );
};
