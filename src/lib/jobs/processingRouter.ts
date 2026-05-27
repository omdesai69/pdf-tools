/**
 * Client/Server Processing Router
 * Determines optimal processing location based on file, operation, and device capabilities
 */

export interface DeviceCapabilities {
    hasWasm: boolean;
    memory: number; // GB
    cores: number;
    connectionType: string;
    isMobile: boolean;
    isLowPower: boolean;
}

export type ProcessingLocation = 'client' | 'server' | 'hybrid';

export interface RoutingDecision {
    location: ProcessingLocation;
    reason: string;
    estimatedTime?: number;
    fallbackLocation?: ProcessingLocation;
}

// Operations that can run client-side
const CLIENT_CAPABLE_OPS = new Set([
    'merge',
    'split',
    'extract_pages',
    'delete_pages',
    'rotate',
    'reorder',
    'split_half',
]);

// Operations that require server
const SERVER_ONLY_OPS = new Set([
    'ocr',
    'pdf_to_word',
    'pdf_to_excel',
    'pdf_to_ppt',
    'word_to_pdf',
    'compress_max',
    'deskew',
]);

// Operations that benefit from hybrid approach
const HYBRID_OPS = new Set([
    'compress',
    'watermark',
    'pdf_to_jpg',
    'jpg_to_pdf',
]);

export class ProcessingRouter {
    /**
     * Determine optimal processing location
     */
    route(
        fileSizeMB: number,
        operation: string,
        capabilities: DeviceCapabilities
    ): RoutingDecision {
        // Server-only operations always go to server
        if (SERVER_ONLY_OPS.has(operation)) {
            return {
                location: 'server',
                reason: `${operation} requires server-side processing`,
            };
        }

        // Force server for large files
        if (fileSizeMB > 50) {
            return {
                location: 'server',
                reason: 'File too large for client processing',
            };
        }

        // Force server for low-memory mobile devices
        if (capabilities.isMobile && capabilities.memory < 4 && fileSizeMB > 5) {
            return {
                location: 'server',
                reason: 'Low memory mobile device',
                fallbackLocation: 'client',
            };
        }

        // Force server for slow connections (let server do heavy lifting)
        if (capabilities.connectionType === '2g' || capabilities.connectionType === 'slow-2g') {
            // Actually, for slow connections, prefer client to avoid upload
            if (fileSizeMB < 10 && CLIENT_CAPABLE_OPS.has(operation)) {
                return {
                    location: 'client',
                    reason: 'Slow connection - prefer local processing',
                };
            }
        }

        // No WASM support - must use server
        if (!capabilities.hasWasm) {
            return {
                location: 'server',
                reason: 'Browser does not support WebAssembly',
            };
        }

        // Hybrid operations
        if (HYBRID_OPS.has(operation)) {
            if (fileSizeMB < 10) {
                return {
                    location: 'client',
                    reason: 'Small file - client processing preferred',
                };
            } else if (fileSizeMB < 30) {
                return {
                    location: 'hybrid',
                    reason: 'Medium file - hybrid processing',
                };
            } else {
                return {
                    location: 'server',
                    reason: 'Large file - server processing preferred',
                };
            }
        }

        // Client-capable operations
        if (CLIENT_CAPABLE_OPS.has(operation)) {
            if (fileSizeMB < 20) {
                return {
                    location: 'client',
                    reason: 'Simple operation on moderate file',
                };
            } else {
                return {
                    location: 'server',
                    reason: 'Large file for client operation',
                    fallbackLocation: 'client',
                };
            }
        }

        // Default to server for unknown operations
        return {
            location: 'server',
            reason: 'Default routing',
        };
    }

    /**
     * Detect client capabilities (run in browser)
     */
    static detectCapabilitiesScript(): string {
        return `
      (function() {
        return {
          hasWasm: typeof WebAssembly !== 'undefined',
          memory: navigator.deviceMemory || 4,
          cores: navigator.hardwareConcurrency || 2,
          connectionType: navigator.connection?.effectiveType || '4g',
          isMobile: /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent),
          isLowPower: navigator.getBattery ? false : false, // Simplified
        };
      })()
    `;
    }
}

// Singleton
export const processingRouter = new ProcessingRouter();
