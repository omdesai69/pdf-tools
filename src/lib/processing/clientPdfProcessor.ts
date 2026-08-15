'use client';

import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { PDFOperation, OperationOptions, ProcessingResult } from './pdfProcessor';

export interface ClientProcessingResult {
    success: boolean;
    blob?: Blob;
    downloadUrl?: string;
    outputFilename?: string;
    pageCount?: number;
    fileSize?: number;
    error?: string;
    processingTimeMs?: number;
}

/**
 * In-Browser Zero-Knowledge PDF Processor
 * Executes all transformations entirely within client memory (0ms server latency, 100% privacy).
 */
export class ClientPDFProcessor {
    /**
     * Main client execution entry point
     */
    async process(
        operation: string,
        files: File[],
        options: OperationOptions = {}
    ): Promise<ClientProcessingResult> {
        const startTime = performance.now();

        try {
            if (!files || files.length === 0) {
                return { success: false, error: 'No files provided' };
            }

            let resultDoc: PDFDocument;
            let outputFilename = 'processed_document.pdf';

            switch (operation) {
                case 'merge': {
                    resultDoc = await PDFDocument.create();
                    for (const file of files) {
                        const bytes = await file.arrayBuffer();
                        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
                        const copied = await resultDoc.copyPages(src, src.getPageIndices());
                        copied.forEach(p => resultDoc.addPage(p));
                    }
                    outputFilename = 'merged.pdf';
                    break;
                }

                case 'split':
                case 'extract':
                case 'extract_pages': {
                    const bytes = await files[0].arrayBuffer();
                    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    resultDoc = await PDFDocument.create();
                    const total = src.getPageCount();

                    let pages = options.pages || (options.splitValue
                        ? options.splitValue.split(',').flatMap(part => {
                            if (part.includes('-')) {
                                const [s, e] = part.split('-').map(n => parseInt(n.trim(), 10));
                                if (!isNaN(s) && !isNaN(e)) {
                                    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
                                }
                            }
                            const n = parseInt(part.trim(), 10);
                            return isNaN(n) ? [] : [n];
                        })
                        : [1]);

                    const indices = pages.map(p => p - 1).filter(idx => idx >= 0 && idx < total);
                    const copied = await resultDoc.copyPages(src, indices.length > 0 ? indices : [0]);
                    copied.forEach(p => resultDoc.addPage(p));
                    outputFilename = 'extracted.pdf';
                    break;
                }

                case 'delete':
                case 'delete-pages': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    const total = resultDoc.getPageCount();
                    const toDelete = (options.splitValue || '')
                        .split(',')
                        .map(s => parseInt(s.trim(), 10))
                        .filter(n => !isNaN(n) && n >= 1 && n <= total)
                        .sort((a, b) => b - a);

                    toDelete.forEach(p => {
                        if (resultDoc.getPageCount() > 1) {
                            resultDoc.removePage(p - 1);
                        }
                    });
                    outputFilename = 'trimmed.pdf';
                    break;
                }

                case 'rotate': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    const total = resultDoc.getPageCount();
                    const deg = parseInt(String(options.rotationAngle || options.rotation || 90), 10);

                    if (options.rotations && typeof options.rotations === 'object') {
                        for (let i = 0; i < total; i++) {
                            const pageNum = i + 1;
                            const angle = Number(options.rotations[pageNum]);
                            if (!isNaN(angle) && angle !== 0) {
                                const page = resultDoc.getPage(i);
                                page.setRotation(degrees((page.getRotation().angle + angle) % 360));
                            }
                        }
                    } else {
                        for (let i = 0; i < total; i++) {
                            const page = resultDoc.getPage(i);
                            page.setRotation(degrees((page.getRotation().angle + deg) % 360));
                        }
                    }
                    outputFilename = 'rotated.pdf';
                    break;
                }

                case 'reorder':
                case 'organize-pages': {
                    const bytes = await files[0].arrayBuffer();
                    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    resultDoc = await PDFDocument.create();
                    const total = src.getPageCount();

                    let order = options.pageOrder || (options.splitValue
                        ? options.splitValue.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
                        : src.getPageIndices().map(i => i + 1));

                    const indices = order.map((p: number) => p - 1).filter((idx: number) => idx >= 0 && idx < total);
                    const copied = await resultDoc.copyPages(src, indices.length > 0 ? indices : src.getPageIndices());
                    copied.forEach((p: any) => resultDoc.addPage(p));
                    outputFilename = 'reordered.pdf';
                    break;
                }

                case 'sign': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    if (options.signatureDataUrl) {
                        const pageNum = parseInt(String(options.signaturePage || 1), 10);
                        const total = resultDoc.getPageCount();
                        if (pageNum >= 1 && pageNum <= total) {
                            const page = resultDoc.getPage(pageNum - 1);
                            const { width, height } = page.getSize();
                            const embeddedImg = await resultDoc.embedPng(options.signatureDataUrl);

                            const sigW = (Number(options.signatureWidth) || 0.25) * width;
                            const sigH = (Number(options.signatureHeight) || 0.12) * height;
                            const sigX = (Number(options.signatureX) || 0.1) * width;
                            const sigY = (Number(options.signatureY) || 0.1) * height;

                            page.drawImage(embeddedImg, {
                                x: Math.max(0, Math.min(width - sigW, sigX)),
                                y: Math.max(0, Math.min(height - sigH, sigY)),
                                width: sigW,
                                height: sigH,
                            });
                        }
                    }
                    outputFilename = 'signed.pdf';
                    break;
                }

                case 'dark-mode': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    resultDoc.getPages().forEach(page => {
                        const { width, height } = page.getSize();
                        // Dark overlay rectangle
                        page.drawRectangle({
                            x: 0,
                            y: 0,
                            width,
                            height,
                            color: rgb(0.1, 0.12, 0.15),
                            opacity: 0.85,
                        });
                    });
                    outputFilename = 'dark_mode.pdf';
                    break;
                }

                case 'sanitize': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    // Scrub all metadata
                    resultDoc.setTitle('');
                    resultDoc.setAuthor('');
                    resultDoc.setSubject('');
                    resultDoc.setKeywords([]);
                    resultDoc.setProducer('PDF Tools Sanitizer');
                    resultDoc.setCreator('PDF Tools Sanitizer');
                    resultDoc.setCreationDate(new Date(0));
                    resultDoc.setModificationDate(new Date(0));
                    outputFilename = 'sanitized.pdf';
                    break;
                }

                case 'booklet': {
                    const bytes = await files[0].arrayBuffer();
                    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    resultDoc = await PDFDocument.create();
                    const total = src.getPageCount();

                    // Pad to multiple of 4
                    const totalBookletPages = Math.ceil(total / 4) * 4;
                    const order: (number | null)[] = [];

                    for (let i = 0; i < totalBookletPages / 2; i += 2) {
                        order.push(totalBookletPages - i);     // Back Left
                        order.push(i + 1);                     // Front Right
                        order.push(i + 2);                     // Inside Left
                        order.push(totalBookletPages - i - 1); // Inside Right
                    }

                    for (const pageNum of order) {
                        if (pageNum !== null && pageNum <= total) {
                            const [p] = await resultDoc.copyPages(src, [pageNum - 1]);
                            resultDoc.addPage(p);
                        } else {
                            // Blank filler page
                            const firstPage = src.getPage(0);
                            resultDoc.addPage([firstPage.getWidth(), firstPage.getHeight()]);
                        }
                    }
                    outputFilename = 'booklet.pdf';
                    break;
                }

                case 'page-numbers': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    const font = await resultDoc.embedFont(StandardFonts.Helvetica);
                    const total = resultDoc.getPageCount();
                    resultDoc.getPages().forEach((page, idx) => {
                        const text = `Page ${idx + 1} of ${total}`;
                        const textWidth = font.widthOfTextAtSize(text, 10);
                        page.drawText(text, {
                            x: (page.getWidth() - textWidth) / 2,
                            y: 25,
                            size: 10,
                            font,
                            color: rgb(0.4, 0.4, 0.4),
                        });
                    });
                    outputFilename = 'numbered.pdf';
                    break;
                }

                case 'watermark': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    const text = (options.watermarkText || 'CONFIDENTIAL').trim();
                    const opacity = Math.min(1, Math.max(0.05, (options.watermarkOpacity || 30) / 100));
                    const font = await resultDoc.embedFont(StandardFonts.HelveticaBold);
                    resultDoc.getPages().forEach(page => {
                        const { width, height } = page.getSize();
                        const fontSize = Math.min(width, height) / 8;
                        const textWidth = font.widthOfTextAtSize(text, fontSize);
                        page.drawText(text, {
                            x: (width - textWidth) / 2,
                            y: height / 2,
                            size: fontSize,
                            font,
                            color: rgb(0.7, 0.7, 0.7),
                            opacity,
                            rotate: degrees(45),
                        });
                    });
                    outputFilename = 'watermarked.pdf';
                    break;
                }

                case 'flatten': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    try { resultDoc.getForm().flatten(); } catch {}
                    outputFilename = 'flattened.pdf';
                    break;
                }

                case 'edit-metadata': {
                    const bytes = await files[0].arrayBuffer();
                    resultDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
                    if (options.title) resultDoc.setTitle(options.title);
                    if (options.author) resultDoc.setAuthor(options.author);
                    if (options.subject) resultDoc.setSubject(options.subject);
                    outputFilename = 'metadata_updated.pdf';
                    break;
                }

                case 'image-to-pdf': {
                    resultDoc = await PDFDocument.create();
                    for (const file of files) {
                        const imgBytes = await file.arrayBuffer();
                        let img;
                        try {
                            img = file.type.includes('png') ? await resultDoc.embedPng(imgBytes) : await resultDoc.embedJpg(imgBytes);
                        } catch {
                            try { img = await resultDoc.embedJpg(imgBytes); } catch { img = await resultDoc.embedPng(imgBytes); }
                        }
                        if (img) {
                            const page = resultDoc.addPage([img.width, img.height]);
                            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
                        }
                    }
                    outputFilename = 'images.pdf';
                    break;
                }

                default:
                    return { success: false, error: `Unsupported in-browser tool: ${operation}` };
            }

            const outputPdfBytes = await resultDoc.save();
            const blob = new Blob([outputPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const downloadUrl = URL.createObjectURL(blob);

            return {
                success: true,
                blob,
                downloadUrl,
                outputFilename,
                pageCount: resultDoc.getPageCount(),
                fileSize: outputPdfBytes.length,
                processingTimeMs: Math.round(performance.now() - startTime),
            };
        } catch (err) {
            console.error('Client PDF processing error:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Client PDF processing failed',
            };
        }
    }
}

export const clientPdfProcessor = new ClientPDFProcessor();
