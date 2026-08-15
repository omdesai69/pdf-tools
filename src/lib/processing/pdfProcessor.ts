import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { storage } from '../security/storage';
import { jobManager } from '../jobs/stateMachine';

export type PDFOperation =
    | 'merge'
    | 'split'
    | 'extract'
    | 'extract_pages'
    | 'delete'
    | 'delete-pages'
    | 'delete_pages'
    | 'rotate'
    | 'reorder'
    | 'organize-pages'
    | 'rename'
    | 'alternate-mix'
    | 'image-to-pdf'
    | 'jpg_to_pdf'
    | 'page-numbers'
    | 'bates'
    | 'watermark'
    | 'flatten'
    | 'edit-metadata'
    | 'sign'
    | 'dark-mode'
    | 'sanitize'
    | 'booklet';

export interface OperationOptions {
    splitValue?: string;
    pages?: number[];
    rotation?: number | string;
    rotationAngle?: number | string;
    pageRange?: string;
    watermarkText?: string;
    watermarkOpacity?: number;
    batesPrefix?: string;
    batesStartNumber?: number;
    newFilename?: string;
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    [key: string]: any;
}

export interface ProcessingResult {
    success: boolean;
    outputPath?: string;
    outputFilename?: string;
    pageCount?: number;
    fileSize?: number;
    error?: string;
    processingTimeMs?: number;
}

/**
 * Parses user input like "1-3, 5, 7-10" into 1-based sorted unique page numbers.
 */
function parsePageNumbers(rangeStr?: string | number[], totalPages: number = 999999): number[] {
    if (!rangeStr) return [];
    if (Array.isArray(rangeStr)) {
        return rangeStr.filter(p => p >= 1 && p <= totalPages);
    }
    const cleanStr = String(rangeStr).trim().toLowerCase();
    if (cleanStr === 'all' || !cleanStr) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    for (const part of cleanStr.split(',')) {
        const item = part.trim();
        if (item.includes('-')) {
            const [start, end] = item.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
                const min = Math.max(1, Math.min(start, end));
                const max = Math.min(totalPages, Math.max(start, end));
                for (let i = min; i <= max; i++) pages.add(i);
            }
        } else {
            const n = parseInt(item, 10);
            if (!isNaN(n) && n >= 1 && n <= totalPages) pages.add(n);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

/**
 * PDF Processing Pipeline - Streamlined, memory-safe, and optimal Big-O complexity
 */
export class PDFProcessor {
    /**
     * Executes a PDF transform pipeline and writes output in one atomic step.
     */
    private async transformDoc(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        outputFilename: string,
        transform: (pdf: PDFDocument) => Promise<void | PDFDocument>
    ): Promise<ProcessingResult> {
        const inputBytes = await fs.readFile(path.join(inputDir, inputFile));
        const sourceDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
        
        const finalDoc = (await transform(sourceDoc)) || sourceDoc;
        const outputBytes = await finalDoc.save();
        const outputPath = path.join(outputDir, outputFilename);
        
        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: finalDoc.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Main processing entry point
     */
    async process(
        jobId: string,
        operation: PDFOperation,
        options: OperationOptions = {}
    ): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            const jobDir = await storage.getJobDirectory(jobId);
            if (!jobDir) return { success: false, error: 'Job directory not found' };

            const inputFiles = await fs.readdir(jobDir.inputDir);
            if (inputFiles.length === 0) return { success: false, error: 'No input files found' };

            await jobManager.transition(jobId, 'processing');

            let result: ProcessingResult;
            const primaryFile = inputFiles[0];

            switch (operation) {
                case 'merge':
                    result = await this.mergePDFs(jobDir.inputDir, jobDir.outputDir, inputFiles);
                    break;

                case 'split':
                case 'extract':
                case 'extract_pages':
                    result = await this.extractPages(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'delete':
                case 'delete-pages':
                case 'delete_pages':
                    result = await this.deletePages(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'rotate':
                    result = await this.rotatePages(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'reorder':
                case 'organize-pages':
                    result = await this.reorderPages(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'rename':
                    result = await this.renamePDF(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'alternate-mix':
                    result = await this.alternateMix(jobDir.inputDir, jobDir.outputDir, inputFiles);
                    break;

                case 'image-to-pdf':
                case 'jpg_to_pdf':
                    result = await this.imagesToPdf(jobDir.inputDir, jobDir.outputDir, inputFiles);
                    break;

                case 'page-numbers':
                    result = await this.addPageNumbers(jobDir.inputDir, jobDir.outputDir, primaryFile);
                    break;

                case 'bates':
                    result = await this.addBatesNumbers(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'watermark':
                    result = await this.addWatermark(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'flatten':
                    result = await this.flattenPDF(jobDir.inputDir, jobDir.outputDir, primaryFile);
                    break;

                case 'edit-metadata':
                    result = await this.editMetadata(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'sign':
                    result = await this.signPDF(jobDir.inputDir, jobDir.outputDir, primaryFile, options);
                    break;

                case 'dark-mode':
                    result = await this.darkModePDF(jobDir.inputDir, jobDir.outputDir, primaryFile);
                    break;

                case 'sanitize':
                    result = await this.sanitizePDF(jobDir.inputDir, jobDir.outputDir, primaryFile);
                    break;

                case 'booklet':
                    result = await this.bookletImposition(jobDir.inputDir, jobDir.outputDir, primaryFile);
                    break;

                default:
                    result = { success: false, error: `Unsupported operation: ${operation}` };
            }

            result.processingTimeMs = Date.now() - startTime;

            if (result.success) {
                await jobManager.transition(jobId, 'completed', {
                    outputFile: result.outputFilename,
                    processingTime: result.processingTimeMs,
                });
            } else {
                await jobManager.transition(jobId, 'failed', { error: result.error });
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Processing failed';
            await jobManager.transition(jobId, 'failed', { error: errorMessage });
            return { success: false, error: errorMessage, processingTimeMs: Date.now() - startTime };
        }
    }

    // --- Core Transformations ---

    private async mergePDFs(inputDir: string, outputDir: string, files: string[]): Promise<ProcessingResult> {
        const mergedDoc = await PDFDocument.create();
        for (const file of files.sort()) {
            const bytes = await fs.readFile(path.join(inputDir, file));
            const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
            const copied = await mergedDoc.copyPages(src, src.getPageIndices());
            copied.forEach(p => mergedDoc.addPage(p));
        }
        const outBytes = await mergedDoc.save();
        const outputPath = path.join(outputDir, 'merged.pdf');
        await fs.writeFile(outputPath, outBytes);
        return { success: true, outputPath, outputFilename: 'merged.pdf', pageCount: mergedDoc.getPageCount(), fileSize: outBytes.length };
    }

    private async extractPages(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'extracted.pdf', async (src) => {
            const total = src.getPageCount();
            let pages = options.pages || parsePageNumbers(options.splitValue, total);
            if (pages.length === 0) pages = [1];
            
            const newDoc = await PDFDocument.create();
            const indices = pages.map(p => p - 1).filter(idx => idx >= 0 && idx < total);
            const copied = await newDoc.copyPages(src, indices);
            copied.forEach(p => newDoc.addPage(p));
            return newDoc;
        });
    }

    private async deletePages(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'trimmed.pdf', async (doc) => {
            const toDelete = parsePageNumbers(options.splitValue || options.pageRange, doc.getPageCount());
            // Remove in descending order to preserve correct indices
            toDelete.sort((a, b) => b - a).forEach(page => {
                const idx = page - 1;
                if (idx >= 0 && idx < doc.getPageCount() && doc.getPageCount() > 1) {
                    doc.removePage(idx);
                }
            });
        });
    }

    private async rotatePages(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        const defaultDeg = parseInt(String(options.rotationAngle || options.rotation || 90), 10);
        return this.transformDoc(inputDir, outputDir, file, 'rotated.pdf', async (doc) => {
            const total = doc.getPageCount();
            
            if (options.rotations && typeof options.rotations === 'object' && Object.keys(options.rotations).length > 0) {
                for (let i = 0; i < total; i++) {
                    const pageNum = i + 1;
                    const angle = Number(options.rotations[pageNum]);
                    if (!isNaN(angle) && angle !== 0) {
                        const page = doc.getPage(i);
                        page.setRotation(degrees((page.getRotation().angle + angle) % 360));
                    }
                }
                return;
            }

            const targetPages = parsePageNumbers(options.pageRange, total);
            const pagesToRotate = targetPages.length > 0 ? targetPages : Array.from({ length: total }, (_, i) => i + 1);
            
            pagesToRotate.forEach(pageNum => {
                const idx = pageNum - 1;
                if (idx >= 0 && idx < total) {
                    const page = doc.getPage(idx);
                    page.setRotation(degrees((page.getRotation().angle + defaultDeg) % 360));
                }
            });
        });
    }

    private async reorderPages(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'reordered.pdf', async (src) => {
            const total = src.getPageCount();
            const order = parsePageNumbers(options.splitValue || options.pages, total);
            if (order.length === 0) return src;

            const newDoc = await PDFDocument.create();
            const indices = order.map(p => p - 1).filter(idx => idx >= 0 && idx < total);
            const copied = await newDoc.copyPages(src, indices);
            copied.forEach(p => newDoc.addPage(p));
            return newDoc;
        });
    }

    private async renamePDF(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        const rawName = (options.newFilename || options.watermarkText || 'renamed_document').trim();
        const safeName = `${rawName.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.pdf$/i, '')}.pdf`;
        return this.transformDoc(inputDir, outputDir, file, safeName, async () => {});
    }

    private async alternateMix(inputDir: string, outputDir: string, files: string[]): Promise<ProcessingResult> {
        if (files.length < 2) return { success: false, error: 'Alternate & Mix requires at least 2 PDF files' };
        
        const sorted = files.sort();
        const b1 = await fs.readFile(path.join(inputDir, sorted[0]));
        const b2 = await fs.readFile(path.join(inputDir, sorted[1]));
        const doc1 = await PDFDocument.load(b1, { ignoreEncryption: true });
        const doc2 = await PDFDocument.load(b2, { ignoreEncryption: true });
        
        const mixed = await PDFDocument.create();
        const maxPages = Math.max(doc1.getPageCount(), doc2.getPageCount());

        for (let i = 0; i < maxPages; i++) {
            if (i < doc1.getPageCount()) {
                const [p] = await mixed.copyPages(doc1, [i]);
                mixed.addPage(p);
            }
            if (i < doc2.getPageCount()) {
                const [p] = await mixed.copyPages(doc2, [i]);
                mixed.addPage(p);
            }
        }

        const outBytes = await mixed.save();
        const outputPath = path.join(outputDir, 'mixed.pdf');
        await fs.writeFile(outputPath, outBytes);
        return { success: true, outputPath, outputFilename: 'mixed.pdf', pageCount: mixed.getPageCount(), fileSize: outBytes.length };
    }

    private async imagesToPdf(inputDir: string, outputDir: string, files: string[]): Promise<ProcessingResult> {
        const pdf = await PDFDocument.create();

        for (const file of files.sort()) {
            const filePath = path.join(inputDir, file);
            const imageBytes = await fs.readFile(filePath);
            const ext = path.extname(file).toLowerCase();

            let image;
            try {
                if (ext === '.jpg' || ext === '.jpeg' || ext === '.jfif') {
                    image = await pdf.embedJpg(imageBytes);
                } else if (ext === '.png') {
                    image = await pdf.embedPng(imageBytes);
                } else {
                    try { image = await pdf.embedJpg(imageBytes); }
                    catch { image = await pdf.embedPng(imageBytes); }
                }

                const page = pdf.addPage([image.width, image.height]);
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            } catch (err) {
                console.error(`Skipping invalid image file ${file}:`, err);
            }
        }

        if (pdf.getPageCount() === 0) return { success: false, error: 'No valid JPG or PNG images could be converted' };

        const outBytes = await pdf.save();
        const outputPath = path.join(outputDir, 'images.pdf');
        await fs.writeFile(outputPath, outBytes);
        return { success: true, outputPath, outputFilename: 'images.pdf', pageCount: pdf.getPageCount(), fileSize: outBytes.length };
    }

    private async addPageNumbers(inputDir: string, outputDir: string, file: string): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'numbered.pdf', async (doc) => {
            const font = await doc.embedFont(StandardFonts.Helvetica);
            const total = doc.getPageCount();
            doc.getPages().forEach((page, idx) => {
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
        });
    }

    private async addBatesNumbers(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        const prefix = options.batesPrefix || 'DOC-';
        const start = parseInt(String(options.batesStartNumber || 1), 10);
        return this.transformDoc(inputDir, outputDir, file, 'bates_stamped.pdf', async (doc) => {
            const font = await doc.embedFont(StandardFonts.CourierBold);
            doc.getPages().forEach((page, idx) => {
                const stamp = `${prefix}${String(start + idx).padStart(6, '0')}`;
                const textWidth = font.widthOfTextAtSize(stamp, 10);
                page.drawText(stamp, {
                    x: page.getWidth() - textWidth - 30,
                    y: 20,
                    size: 10,
                    font,
                    color: rgb(0.2, 0.2, 0.2),
                });
            });
        });
    }

    private async addWatermark(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        const text = (options.watermarkText || 'CONFIDENTIAL').trim();
        const opacity = Math.min(1, Math.max(0.05, (options.watermarkOpacity || 30) / 100));
        return this.transformDoc(inputDir, outputDir, file, 'watermarked.pdf', async (doc) => {
            const font = await doc.embedFont(StandardFonts.HelveticaBold);
            doc.getPages().forEach(page => {
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
        });
    }

    private async flattenPDF(inputDir: string, outputDir: string, file: string): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'flattened.pdf', async (doc) => {
            try { doc.getForm().flatten(); } catch { /* Ignore if no form fields */ }
        });
    }

    private async editMetadata(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'metadata_updated.pdf', async (doc) => {
            if (options.title) doc.setTitle(options.title);
            if (options.author) doc.setAuthor(options.author);
            if (options.subject) doc.setSubject(options.subject);
            if (options.keywords) doc.setKeywords(options.keywords.split(',').map(k => k.trim()));
        });
    }

    private async signPDF(inputDir: string, outputDir: string, file: string, options: OperationOptions): Promise<ProcessingResult> {
        if (!options.signatureDataUrl) {
            return { success: false, error: 'No signature provided' };
        }

        return this.transformDoc(inputDir, outputDir, file, 'signed.pdf', async (doc) => {
            const pageNum = parseInt(String(options.signaturePage || 1), 10);
            const total = doc.getPageCount();
            if (pageNum < 1 || pageNum > total) return;

            const page = doc.getPage(pageNum - 1);
            const { width, height } = page.getSize();

            // Decode base64 PNG
            const base64Data = options.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBytes = Buffer.from(base64Data, 'base64');
            const embeddedImg = await doc.embedPng(imgBytes);

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
        });
    }

    private async darkModePDF(inputDir: string, outputDir: string, file: string): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'dark_mode.pdf', async (doc) => {
            doc.getPages().forEach(page => {
                const { width, height } = page.getSize();
                page.drawRectangle({
                    x: 0,
                    y: 0,
                    width,
                    height,
                    color: rgb(0.1, 0.12, 0.15),
                    opacity: 0.85,
                });
            });
        });
    }

    private async sanitizePDF(inputDir: string, outputDir: string, file: string): Promise<ProcessingResult> {
        return this.transformDoc(inputDir, outputDir, file, 'sanitized.pdf', async (doc) => {
            doc.setTitle('');
            doc.setAuthor('');
            doc.setSubject('');
            doc.setKeywords([]);
            doc.setProducer('PDF Tools Sanitizer');
            doc.setCreator('PDF Tools Sanitizer');
            doc.setCreationDate(new Date(0));
            doc.setModificationDate(new Date(0));
        });
    }

    private async bookletImposition(inputDir: string, outputDir: string, file: string): Promise<ProcessingResult> {
        const inputBytes = await fs.readFile(path.join(inputDir, file));
        const src = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
        const newDoc = await PDFDocument.create();
        const total = src.getPageCount();

        const totalBookletPages = Math.ceil(total / 4) * 4;
        const order: (number | null)[] = [];

        for (let i = 0; i < totalBookletPages / 2; i += 2) {
            order.push(totalBookletPages - i);
            order.push(i + 1);
            order.push(i + 2);
            order.push(totalBookletPages - i - 1);
        }

        for (const pageNum of order) {
            if (pageNum !== null && pageNum <= total) {
                const [p] = await newDoc.copyPages(src, [pageNum - 1]);
                newDoc.addPage(p);
            } else {
                const firstPage = src.getPage(0);
                newDoc.addPage([firstPage.getWidth(), firstPage.getHeight()]);
            }
        }

        const outBytes = await newDoc.save();
        const outputPath = path.join(outputDir, 'booklet.pdf');
        await fs.writeFile(outputPath, outBytes);

        return {
            success: true,
            outputPath,
            outputFilename: 'booklet.pdf',
            pageCount: newDoc.getPageCount(),
            fileSize: outBytes.length,
        };
    }
}

export const pdfProcessor = new PDFProcessor();
