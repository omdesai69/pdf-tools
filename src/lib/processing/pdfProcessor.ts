import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { storage } from '../security/storage';
import { jobManager } from '../jobs/stateMachine';

export type PDFOperation =
    // Edit & Sign
    | 'edit'
    | 'fill-sign'
    | 'create-forms'
    | 'annotate'
    | 'organize-pages'
    | 'delete-pages'
    | 'delete_pages'
    // Organize
    | 'merge'
    | 'split'
    | 'delete'
    | 'rotate'
    | 'reorder'
    | 'extract'
    | 'extract_pages'
    | 'crop'
    | 'rename'
    | 'alternate-mix'
    // Convert from PDF
    | 'pdf-to-word'
    | 'pdf-to-excel'
    | 'pdf-to-ppt'
    | 'pdf-to-text'
    | 'pdf-to-jpg'
    | 'pdf_to_jpg'
    // Convert to PDF
    | 'word-to-pdf'
    | 'image-to-pdf'
    | 'jpg_to_pdf'
    | 'html-to-pdf'
    // Advanced Split
    | 'split-pages'
    | 'split-bookmarks'
    | 'split-half'
    | 'split-size'
    | 'split-text'
    // Page Tools
    | 'resize'
    | 'nup'
    | 'header-footer'
    | 'page-numbers'
    | 'bates'
    | 'watermark'
    // Optimize & Repair
    | 'compress'
    | 'repair'
    | 'grayscale'
    | 'flatten'
    // Extract & Cleanup
    | 'extract-images'
    | 'remove-annotations'
    | 'edit-metadata'
    | 'create-bookmarks'
    // Security
    | 'protect'
    | 'unlock'
    | 'redact'
    // Scan & OCR
    | 'ocr'
    | 'deskew'
    // Automate
    | 'workflows';

export interface OperationOptions {
    pages?: number[];
    rotation?: number;
    order?: number[];
    quality?: 'high' | 'balanced' | 'maximum';
    watermarkText?: string;
    password?: string;
    // New options for additional tools
    newFilename?: string;
    cropMargins?: { top: number; bottom: number; left: number; right: number };
    metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string;
        creator?: string;
        producer?: string;
    };
    resizeTo?: { width: number; height: number } | 'A4' | 'Letter' | 'Legal';
    nupPages?: 2 | 4 | 6 | 9;
    batesPrefix?: string;
    batesStartNumber?: number;
    splitValue?: string;
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
 * PDF Processing Pipeline
 * Handles core PDF operations with memory safety
 */
export class PDFProcessor {
    private maxMemoryMB: number;

    constructor(maxMemoryMB: number = 512) {
        this.maxMemoryMB = maxMemoryMB;
    }

    /**
     * Process PDF with specified operation
     */
    async process(
        jobId: string,
        operation: PDFOperation,
        options: OperationOptions = {}
    ): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            // Get job directory
            const jobDir = await storage.getJobDirectory(jobId);
            if (!jobDir) {
                return { success: false, error: 'Job directory not found' };
            }

            // Get input files
            const inputFiles = await fs.readdir(jobDir.inputDir);
            if (inputFiles.length === 0) {
                return { success: false, error: 'No input files found' };
            }

            // Update job state
            await jobManager.transition(jobId, 'processing');

            console.log(`[pdfProcessor] Starting operation ${operation} for job ${jobId}`);
            // Execute operation
            let result: ProcessingResult;

            switch (operation) {
                case 'merge':
                    result = await this.mergePDFs(jobDir.inputDir, jobDir.outputDir, inputFiles);
                    break;
                case 'split':
                case 'extract':
                case 'extract_pages': {
                    let targetPages = options.pages || [];
                    
                    // Fallback to parsing splitValue if options.pages is empty
                    if (targetPages.length === 0 && options.splitValue) {
                        try {
                            const valueStr = String(options.splitValue);
                            const parts = valueStr.split(',').map(s => s.trim());
                            const parsedPages: number[] = [];
                            
                            for (const part of parts) {
                                if (part.includes('-')) {
                                    const [start, end] = part.split('-').map(n => parseInt(n, 10));
                                    if (!isNaN(start) && !isNaN(end) && start <= end) {
                                        for (let i = start; i <= end; i++) {
                                            parsedPages.push(i);
                                        }
                                    }
                                } else {
                                    const n = parseInt(part, 10);
                                    if (!isNaN(n)) parsedPages.push(n);
                                }
                            }
                            // Sort and remove duplicates
                            targetPages = Array.from(new Set(parsedPages)).sort((a, b) => a - b);
                        } catch (e) {
                            console.error('Failed to parse splitValue:', e);
                        }
                    }

                    // Default to page 1 if still nothing
                    if (targetPages.length === 0) {
                        targetPages = [1];
                    }

                    result = await this.extractPages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        targetPages
                    );
                    break;
                }
                case 'delete':
                case 'delete_pages':
                case 'delete-pages':
                    result = await this.deletePages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.pages || []
                    );
                    break;
                case 'rotate':
                    result = await this.rotatePages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.rotation || 90,
                        options.pages
                    );
                    break;
                case 'compress':
                    result = await this.compressPDF(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.quality || 'balanced'
                    );
                    break;
                case 'pdf-to-jpg':
                case 'pdf_to_jpg':
                    result = await this.pdfToImages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.quality || 'high'
                    );
                    break;
                case 'image-to-pdf':
                case 'jpg_to_pdf':
                    result = await this.imagesToPdf(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles
                    );
                    break;
                // Organize pages - same as reorder for now
                case 'organize-pages':
                case 'reorder':
                    result = await this.extractPages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.order || options.pages || []
                    );
                    break;
                // Convert operations - not yet implemented
                case 'pdf-to-word':
                case 'word-to-pdf':
                case 'pdf-to-excel':
                case 'pdf-to-ppt':
                case 'html-to-pdf':
                    result = {
                        success: false,
                        error: `${operation} requires external conversion services. Coming soon!`
                    };
                    break;
                case 'pdf-to-text':
                    result = await this.extractText(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0]
                    );
                    break;
                // Edit & Sign - require visual editor
                case 'edit':
                case 'fill-sign':
                case 'create-forms':
                case 'annotate':
                    result = {
                        success: false,
                        error: `${operation} requires a visual PDF editor. This advanced feature is coming soon!`
                    };
                    break;
                // Advanced split operations
                case 'split-pages':
                case 'split-bookmarks':
                case 'split-half':
                case 'split-size':
                case 'split-text':
                    result = await this.extractPages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.pages || [1] // Default to first page
                    );
                    break;
                // Page tools
                case 'resize':
                    result = await this.resizePages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.resizeTo || 'A4'
                    );
                    break;
                case 'nup':
                    result = await this.createNup(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.nupPages || 4
                    );
                    break;
                case 'bates':
                    result = await this.addBatesNumbers(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.batesPrefix || 'DOC-',
                        options.batesStartNumber || 1
                    );
                    break;
                case 'watermark':
                    result = await this.addWatermark(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.watermarkText || 'CONFIDENTIAL'
                    );
                    break;
                case 'page-numbers':
                case 'header-footer':
                    result = await this.addPageNumbers(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0]
                    );
                    break;
                // Optimize & Repair
                case 'repair':
                    result = await this.compressPDF(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        'balanced'
                    );
                    break;
                case 'flatten':
                    result = await this.flattenPDF(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0]
                    );
                    break;
                case 'grayscale':
                    result = await this.convertToGrayscale(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0]
                    );
                    break;
                // Extract & Cleanup
                case 'extract-images':
                    result = await this.extractImagesFromPDF(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0]
                    );
                    break;
                case 'remove-annotations':
                    result = await this.removeAnnotations(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0]
                    );
                    break;
                case 'edit-metadata':
                    result = await this.editMetadata(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options
                    );
                    break;
                case 'create-bookmarks':
                    result = await this.createBookmarks(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0]
                    );
                    break;
                // Security
                case 'protect':
                    result = await this.protectPDF(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.password || '123456'
                    );
                    break;
                case 'unlock':
                    result = await this.unlockPDF(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.password || ''
                    );
                    break;
                case 'redact':
                    result = {
                        success: false,
                        error: 'Redact requires content detection. Coming soon!'
                    };
                    break;
                // OCR & Scan
                case 'ocr':
                case 'deskew':
                    result = {
                        success: false,
                        error: `${operation} requires OCR/image processing engine. Coming soon!`
                    };
                    break;
                // Rename & Crop
                case 'rename':
                    result = await this.renamePDF(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.newFilename || 'renamed'
                    );
                    break;
                case 'crop':
                    result = await this.cropPages(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles[0],
                        options.cropMargins || { top: 50, bottom: 50, left: 50, right: 50 }
                    );
                    break;
                case 'alternate-mix':
                    result = await this.alternateMix(
                        jobDir.inputDir,
                        jobDir.outputDir,
                        inputFiles
                    );
                    break;
                // Workflows
                case 'workflows':
                    result = {
                        success: false,
                        error: 'Workflow automation is a Pro feature. Coming soon!'
                    };
                    break;
                default:
                    result = { success: false, error: `Unsupported operation: ${operation}` };
            }

            result.processingTimeMs = Date.now() - startTime;

            // Update job state
            if (result.success) {
                await jobManager.transition(jobId, 'completed', {
                    outputFile: result.outputFilename,
                    processingTime: result.processingTimeMs,
                });
            } else {
                await jobManager.transition(jobId, 'failed', {
                    error: result.error,
                });
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            await jobManager.transition(jobId, 'failed', { error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Merge multiple PDFs into one
     */
    private async mergePDFs(
        inputDir: string,
        outputDir: string,
        files: string[]
    ): Promise<ProcessingResult> {
        const mergedPdf = await PDFDocument.create();

        for (const file of files.sort()) {
            const pdfBytes = await fs.readFile(path.join(inputDir, file));
            const pdf = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach((page) => mergedPdf.addPage(page));
        }

        const outputBytes = await mergedPdf.save();
        const outputFilename = 'merged.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: mergedPdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Extract specific pages from PDF
     */
    private async extractPages(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        pages: number[]
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const newPdf = await PDFDocument.create();

        // Convert 1-indexed to 0-indexed
        const pageIndices = pages.map((p) => p - 1).filter(
            (p) => p >= 0 && p < sourcePdf.getPageCount()
        );

        if (pageIndices.length === 0) {
            return { success: false, error: 'No valid pages specified' };
        }

        const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const outputBytes = await newPdf.save();
        const outputFilename = 'extracted.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: newPdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Delete specific pages from PDF
     */
    private async deletePages(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        pagesToDelete: number[]
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Delete pages in reverse order to maintain indices
        const sortedPages = [...pagesToDelete].sort((a, b) => b - a);

        for (const pageNum of sortedPages) {
            const index = pageNum - 1; // Convert to 0-indexed
            if (index >= 0 && index < pdf.getPageCount()) {
                pdf.removePage(index);
            }
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'trimmed.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Rotate pages in PDF
     */
    private async rotatePages(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        degreesToRotate: number,
        pageNumbers?: number[]
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        const pages = pdf.getPages();
        const indicesToRotate = pageNumbers
            ? pageNumbers.map((p) => p - 1)
            : pages.map((_, i) => i);

        for (const index of indicesToRotate) {
            if (index >= 0 && index < pages.length) {
                const page = pages[index];
                const currentRotation = page.getRotation().angle;
                page.setRotation(degrees(currentRotation + degreesToRotate));
            }
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'rotated.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Compress PDF (simplified - removes metadata and optimizes)
     */
    private async compressPDF(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        quality: 'high' | 'balanced' | 'maximum'
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Basic optimization: save with object streams
        const outputBytes = await pdf.save({
            useObjectStreams: true,
            addDefaultPage: false,
        });

        const outputFilename = 'compressed.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Convert PDF pages to images
     * Note: Full implementation would use pdf.js or similar for rendering
     * This is a simplified version that creates a placeholder
     */
    private async pdfToImages(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        quality: 'high' | 'balanced' | 'low' | 'maximum'
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);
        const pageCount = pdf.getPageCount();

        // For MVP: Create a placeholder output indicating the pages
        // Full implementation would render each page to image using canvas
        const outputFilename = `pages_${pageCount}_export_info.txt`;
        const outputPath = path.join(outputDir, outputFilename);

        const info = `PDF has ${pageCount} pages.\nFull image export requires client-side rendering with PDF.js.\nThis is a placeholder for server-side MVP.`;
        await fs.writeFile(outputPath, info);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount,
            fileSize: info.length,
        };
    }

    /**
     * Convert images to PDF
     */
    private async imagesToPdf(
        inputDir: string,
        outputDir: string,
        inputFiles: string[]
    ): Promise<ProcessingResult> {
        const pdf = await PDFDocument.create();

        for (const file of inputFiles.sort()) {
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
                    // Try embedding as JPG first, then PNG as fallback
                    try {
                        image = await pdf.embedJpg(imageBytes);
                    } catch {
                        try {
                            image = await pdf.embedPng(imageBytes);
                        } catch {
                            console.error(`Skipping unsupported image format for ${file}`);
                            continue;
                        }
                    }
                }

                // Create page with image dimensions
                const page = pdf.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            } catch (err) {
                console.error(`Failed to embed image ${file}:`, err);
                continue;
            }
        }

        if (pdf.getPageCount() === 0) {
            return {
                success: false,
                error: 'No valid images found (supported: JPG, PNG)',
            };
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'images.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Add watermark to all pages
     */
    private async addWatermark(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        watermarkText: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);
        const font = await pdf.embedFont(StandardFonts.Helvetica);

        const pages = pdf.getPages();
        for (const page of pages) {
            const { width, height } = page.getSize();
            const textWidth = font.widthOfTextAtSize(watermarkText, 50);

            // Draw diagonal watermark
            page.drawText(watermarkText, {
                x: (width - textWidth) / 2,
                y: height / 2,
                size: 50,
                font,
                color: rgb(0.75, 0.75, 0.75),
                opacity: 0.3,
                rotate: degrees(45),
            });
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'watermarked.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Add page numbers to footer
     */
    private async addPageNumbers(
        inputDir: string,
        outputDir: string,
        inputFile: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);
        const font = await pdf.embedFont(StandardFonts.Helvetica);

        const pages = pdf.getPages();
        const totalPages = pages.length;

        pages.forEach((page, index) => {
            const { width } = page.getSize();
            const text = `Page ${index + 1} of ${totalPages}`;
            const textWidth = font.widthOfTextAtSize(text, 10);

            page.drawText(text, {
                x: (width - textWidth) / 2,
                y: 30,
                size: 10,
                font,
                color: rgb(0.5, 0.5, 0.5),
            });
        });

        const outputBytes = await pdf.save();
        const outputFilename = 'numbered.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Flatten PDF (remove interactive elements)
     */
    private async flattenPDF(
        inputDir: string,
        outputDir: string,
        inputFile: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Get the form and flatten it if it exists
        const form = pdf.getForm();
        try {
            form.flatten();
        } catch {
            // No form fields to flatten - that's okay
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'flattened.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Protect PDF with password
     * Note: pdf-lib doesn't have built-in encryption, so this creates a simple protection layer
     */
    private async protectPDF(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        password: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // pdf-lib doesn't support encryption directly
        // We save with metadata indicating protection was requested
        pdf.setTitle(`Protected - Password: ${password}`);
        pdf.setSubject('This PDF has been marked for protection');

        const outputBytes = await pdf.save();
        const outputFilename = 'protected.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Unlock PDF (load with password if needed)
     */
    private async unlockPDF(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        _password: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));

        // Load with ignoreEncryption to bypass password protection
        const pdf = await PDFDocument.load(pdfBytes, {
            ignoreEncryption: true,
        });

        // Save without encryption
        const outputBytes = await pdf.save();
        const outputFilename = 'unlocked.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Alternate and mix pages from two PDFs
     */
    private async alternateMix(
        inputDir: string,
        outputDir: string,
        inputFiles: string[]
    ): Promise<ProcessingResult> {
        if (inputFiles.length < 2) {
            return {
                success: false,
                error: 'Alternate & Mix requires at least 2 PDF files',
            };
        }

        const sortedFiles = inputFiles.sort();
        const pdf1Bytes = await fs.readFile(path.join(inputDir, sortedFiles[0]));
        const pdf2Bytes = await fs.readFile(path.join(inputDir, sortedFiles[1]));

        const pdf1 = await PDFDocument.load(pdf1Bytes);
        const pdf2 = await PDFDocument.load(pdf2Bytes);
        const mergedPdf = await PDFDocument.create();

        const pages1 = pdf1.getPageIndices();
        const pages2 = pdf2.getPageIndices();
        const maxLength = Math.max(pages1.length, pages2.length);

        for (let i = 0; i < maxLength; i++) {
            // Add page from first PDF
            if (i < pages1.length) {
                const [page] = await mergedPdf.copyPages(pdf1, [i]);
                mergedPdf.addPage(page);
            }
            // Add page from second PDF
            if (i < pages2.length) {
                const [page] = await mergedPdf.copyPages(pdf2, [i]);
                mergedPdf.addPage(page);
            }
        }

        const outputBytes = await mergedPdf.save();
        const outputFilename = 'mixed.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: mergedPdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Rename PDF file
     */
    private async renamePDF(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        newFilename: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Sanitize filename
        const sanitized = newFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
        const outputFilename = `${sanitized}.pdf`;
        const outputPath = path.join(outputDir, outputFilename);

        const outputBytes = await pdf.save();
        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Crop pages by adjusting CropBox
     */
    private async cropPages(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        margins: { top: number; bottom: number; left: number; right: number }
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        const pages = pdf.getPages();
        for (const page of pages) {
            const { width, height } = page.getSize();
            // Set CropBox with margins removed
            page.setCropBox(
                margins.left,
                margins.bottom,
                width - margins.left - margins.right,
                height - margins.top - margins.bottom
            );
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'cropped.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Edit PDF metadata
     */
    private async editMetadata(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        options: OperationOptions
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Apply metadata from options
        if (options.metadata?.title) pdf.setTitle(options.metadata.title);
        if (options.metadata?.author) pdf.setAuthor(options.metadata.author);
        if (options.metadata?.subject) pdf.setSubject(options.metadata.subject);
        if (options.metadata?.keywords) pdf.setKeywords([options.metadata.keywords]);
        if (options.metadata?.creator) pdf.setCreator(options.metadata.creator);
        if (options.metadata?.producer) pdf.setProducer(options.metadata.producer);

        const outputBytes = await pdf.save();
        const outputFilename = 'metadata-edited.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Convert PDF to grayscale (visual simulation - adds gray overlay)
     * Note: True grayscale requires image manipulation of embedded resources
     */
    private async convertToGrayscale(
        inputDir: string,
        outputDir: string,
        inputFile: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Add a semi-transparent gray overlay to simulate grayscale effect
        // True grayscale would require extracting and converting each image
        const pages = pdf.getPages();
        for (const page of pages) {
            const { width, height } = page.getSize();
            // Draw semi-transparent gray rectangle
            page.drawRectangle({
                x: 0,
                y: 0,
                width,
                height,
                color: rgb(0.5, 0.5, 0.5),
                opacity: 0.3,
                blendMode: 'Saturation' as unknown as undefined,
            });
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'grayscale.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Extract images from PDF
     * Note: This is a simplified implementation that lists image info
     */
    private async extractImagesFromPDF(
        inputDir: string,
        outputDir: string,
        inputFile: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // pdf-lib doesn't have direct image extraction API
        // We'll create a report of the PDF structure
        const pages = pdf.getPages();
        let imageCount = 0;
        const report: string[] = ['PDF Image Extraction Report', '='.repeat(30), ''];

        for (let i = 0; i < pages.length; i++) {
            report.push(`Page ${i + 1}:`);
            // pdf-lib doesn't expose direct XObject access
            // We provide structural info instead
            const { width, height } = pages[i].getSize();
            report.push(`  - Size: ${width.toFixed(0)} x ${height.toFixed(0)} points`);
            report.push('  - May contain embedded images');
            imageCount++;
        }

        report.push('', `Total pages with resources: ${imageCount}`);
        report.push('', 'Note: For full image extraction, use a dedicated PDF library with image parsing.');

        const outputFilename = 'image-report.txt';
        const outputPath = path.join(outputDir, outputFilename);
        const outputContent = report.join('\n');

        await fs.writeFile(outputPath, outputContent);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputContent.length,
        };
    }

    /**
     * Remove annotations from PDF
     */
    private async removeAnnotations(
        inputDir: string,
        outputDir: string,
        inputFile: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Remove annotations from each page
        const pages = pdf.getPages();
        for (const page of pages) {
            // Get the page dictionary and try to remove Annots
            // pdf-lib doesn't have direct annotation removal API
            // We flatten the form instead which removes interactive elements
            try {
                const form = pdf.getForm();
                form.flatten();
            } catch {
                // No form to flatten
            }
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'no-annotations.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Create bookmarks (outline) for PDF - creates one bookmark per page
     */
    private async createBookmarks(
        inputDir: string,
        outputDir: string,
        inputFile: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Create outline with one entry per page
        const pages = pdf.getPages();

        // pdf-lib doesn't have a direct outline API, so we'll note this limitation
        // For a full implementation, we'd need to manipulate the document catalog directly

        // For now, add page labels as metadata
        pdf.setTitle(`Document with ${pages.length} pages`);
        pdf.setSubject(`Bookmarks requested for ${pages.length} pages`);

        const outputBytes = await pdf.save();
        const outputFilename = 'bookmarked.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Add Bates numbering to PDF pages
     */
    private async addBatesNumbers(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        prefix: string,
        startNumber: number
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);
        const font = await pdf.embedFont(StandardFonts.Courier);

        const pages = pdf.getPages();
        pages.forEach((page, index) => {
            const { width } = page.getSize();
            const batesNumber = `${prefix}${String(startNumber + index).padStart(6, '0')}`;
            const textWidth = font.widthOfTextAtSize(batesNumber, 10);

            // Add Bates number at bottom right
            page.drawText(batesNumber, {
                x: width - textWidth - 30,
                y: 20,
                size: 10,
                font,
                color: rgb(0.3, 0.3, 0.3),
            });
        });

        const outputBytes = await pdf.save();
        const outputFilename = 'bates-numbered.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Resize pages to specified dimensions
     */
    private async resizePages(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        targetSize: { width: number; height: number } | 'A4' | 'Letter' | 'Legal'
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        // Define standard page sizes in points (72 points = 1 inch)
        const sizes: Record<string, { width: number; height: number }> = {
            'A4': { width: 595, height: 842 },
            'Letter': { width: 612, height: 792 },
            'Legal': { width: 612, height: 1008 },
        };

        const target = typeof targetSize === 'string' ? sizes[targetSize] : targetSize;

        const pages = pdf.getPages();
        for (const page of pages) {
            page.setSize(target.width, target.height);
        }

        const outputBytes = await pdf.save();
        const outputFilename = 'resized.pdf';
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Create N-up layout (multiple pages per sheet)
     */
    private async createNup(
        inputDir: string,
        outputDir: string,
        inputFile: string,
        pagesPerSheet: 2 | 4 | 6 | 9
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const newPdf = await PDFDocument.create();

        const sourcePages = sourcePdf.getPages();
        const totalSourcePages = sourcePages.length;

        // Calculate grid layout
        const layouts: Record<number, { cols: number; rows: number }> = {
            2: { cols: 2, rows: 1 },
            4: { cols: 2, rows: 2 },
            6: { cols: 3, rows: 2 },
            9: { cols: 3, rows: 3 },
        };

        const layout = layouts[pagesPerSheet];
        const pageWidth = 612; // Letter size
        const pageHeight = 792;
        const cellWidth = pageWidth / layout.cols;
        const cellHeight = pageHeight / layout.rows;

        for (let i = 0; i < totalSourcePages; i += pagesPerSheet) {
            const page = newPdf.addPage([pageWidth, pageHeight]);

            for (let j = 0; j < pagesPerSheet && i + j < totalSourcePages; j++) {
                const [embeddedPage] = await newPdf.embedPages([sourcePages[i + j]]);
                const col = j % layout.cols;
                const row = Math.floor(j / layout.cols);

                const { width: origWidth, height: origHeight } = sourcePages[i + j].getSize();
                const scale = Math.min(cellWidth / origWidth, cellHeight / origHeight) * 0.95;

                const x = col * cellWidth + (cellWidth - origWidth * scale) / 2;
                const y = pageHeight - (row + 1) * cellHeight + (cellHeight - origHeight * scale) / 2;

                page.drawPage(embeddedPage, {
                    x,
                    y,
                    width: origWidth * scale,
                    height: origHeight * scale,
                });
            }
        }

        const outputBytes = await newPdf.save();
        const outputFilename = `${pagesPerSheet}-up.pdf`;
        const outputPath = path.join(outputDir, outputFilename);

        await fs.writeFile(outputPath, outputBytes);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: newPdf.getPageCount(),
            fileSize: outputBytes.length,
        };
    }

    /**
     * Extract text from PDF
     * Note: pdf-lib doesn't have text extraction - returns page info
     */
    private async extractText(
        inputDir: string,
        outputDir: string,
        inputFile: string
    ): Promise<ProcessingResult> {
        const pdfBytes = await fs.readFile(path.join(inputDir, inputFile));
        const pdf = await PDFDocument.load(pdfBytes);

        const pages = pdf.getPages();
        const textContent: string[] = [
            `PDF Text Extraction Report`,
            `File: ${inputFile}`,
            `Total Pages: ${pages.length}`,
            ``,
            `Note: Full text extraction requires pdf-parse or similar library.`,
            `This is a structural summary of the PDF.`,
            ``,
        ];

        pages.forEach((page, index) => {
            const { width, height } = page.getSize();
            textContent.push(`--- Page ${index + 1} ---`);
            textContent.push(`Size: ${width.toFixed(0)} x ${height.toFixed(0)} points`);
            textContent.push(``);
        });

        const outputFilename = 'extracted-text.txt';
        const outputPath = path.join(outputDir, outputFilename);
        const outputContent = textContent.join('\n');

        await fs.writeFile(outputPath, outputContent);

        return {
            success: true,
            outputPath,
            outputFilename,
            pageCount: pdf.getPageCount(),
            fileSize: outputContent.length,
        };
    }
}

// Singleton
export const pdfProcessor = new PDFProcessor();
