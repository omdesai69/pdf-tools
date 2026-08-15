'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './SignatureModal.module.css';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureDataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
    const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
    const [color, setColor] = useState<string>('#000000');
    const [typedName, setTypedName] = useState<string>('');
    const [selectedFont, setSelectedFont] = useState<string>('cursive');
    const [isDrawing, setIsDrawing] = useState<boolean>(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Initialize canvas on draw tab
    useEffect(() => {
        if (isOpen && tab === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Set high DPI canvas resolution
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * 2;
                canvas.height = rect.height * 2;
                ctx.scale(2, 2);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = color;
            }
        }
    }, [isOpen, tab, color]);

    if (!isOpen) return null;

    // Drawing handlers
    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        canvas.setPointerCapture(e.pointerId);
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            try { canvas.releasePointerCapture(e.pointerId); } catch {}
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleSave = () => {
        if (tab === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            onSave(canvas.toDataURL('image/png'));
            onClose();
        } else if (tab === 'type') {
            if (!typedName.trim()) return;
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.font = `60px ${selectedFont}`;
                ctx.fillStyle = color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(typedName, 300, 100);
                onSave(canvas.toDataURL('image/png'));
                onClose();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                onSave(reader.result);
                onClose();
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Create Signature</h3>
                    <button type="button" className={styles.closeBtn} onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={`${styles.tab} ${tab === 'draw' ? styles.active : ''}`}
                        onClick={() => setTab('draw')}
                    >
                        ✍️ Draw
                    </button>
                    <button
                        type="button"
                        className={`${styles.tab} ${tab === 'type' ? styles.active : ''}`}
                        onClick={() => setTab('type')}
                    >
                        ⌨️ Type
                    </button>
                    <button
                        type="button"
                        className={`${styles.tab} ${tab === 'upload' ? styles.active : ''}`}
                        onClick={() => setTab('upload')}
                    >
                        🖼️ Upload
                    </button>
                </div>

                <div className={styles.body}>
                    {/* DRAW TAB */}
                    {tab === 'draw' && (
                        <>
                            <div className={styles.canvasWrapper}>
                                <canvas
                                    ref={canvasRef}
                                    className={styles.canvas}
                                    onPointerDown={startDrawing}
                                    onPointerMove={draw}
                                    onPointerUp={stopDrawing}
                                />
                                <div className={styles.canvasGuide} />
                            </div>

                            <div className={styles.controls}>
                                <div className={styles.colors}>
                                    {['#000000', '#1d4ed8', '#dc2626'].map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`${styles.colorDot} ${color === c ? styles.activeColor : ''}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setColor(c)}
                                        />
                                    ))}
                                </div>
                                <button type="button" className={styles.clearBtn} onClick={clearCanvas}>
                                    Clear
                                </button>
                            </div>
                        </>
                    )}

                    {/* TYPE TAB */}
                    {tab === 'type' && (
                        <>
                            <input
                                type="text"
                                className={styles.typeInput}
                                placeholder="Type your full name..."
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                autoFocus
                            />

                            <div className={styles.fontGrid}>
                                {[
                                    { label: 'Classic Script', font: 'Brush Script MT, cursive' },
                                    { label: 'Elegant Handwritten', font: 'Snell Roundhand, cursive, serif' },
                                    { label: 'Modern Casual', font: 'Bradley Hand, cursive' },
                                    { label: 'Formal Signature', font: 'Lucida Handwriting, cursive' },
                                ].map((item) => (
                                    <div
                                        key={item.font}
                                        className={`${styles.fontCard} ${selectedFont === item.font ? styles.selectedFont : ''}`}
                                        style={{ fontFamily: item.font, color }}
                                        onClick={() => setSelectedFont(item.font)}
                                    >
                                        {typedName || 'Signature'}
                                    </div>
                                ))}
                            </div>

                            <div className={styles.controls}>
                                <div className={styles.colors}>
                                    {['#000000', '#1d4ed8', '#dc2626'].map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`${styles.colorDot} ${color === c ? styles.activeColor : ''}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setColor(c)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* UPLOAD TAB */}
                    {tab === 'upload' && (
                        <label className={styles.uploadBox}>
                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <p style={{ color: '#ffffff', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
                                Click to upload signature image
                            </p>
                            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.8rem' }}>
                                PNG or JPG format (transparent background recommended)
                            </p>
                        </label>
                    )}
                </div>

                <div className={styles.footer}>
                    <button type="button" className={styles.clearBtn} onClick={onClose}>
                        Cancel
                    </button>
                    {tab !== 'upload' && (
                        <button type="button" className={styles.saveBtn} onClick={handleSave}>
                            Adopt Signature
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
