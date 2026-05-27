// Local storage utilities for recently used tools and files

const RECENT_TOOLS_KEY = 'pdf-tools-recent';
const RECENT_FILES_KEY = 'pdf-tools-files';
const MAX_RECENT_TOOLS = 5;
const MAX_RECENT_FILES = 10;

export interface RecentTool {
    id: string;
    name: string;
    icon: string;
    usedAt: number;
}

export interface RecentFile {
    name: string;
    size: number;
    toolId: string;
    toolName: string;
    processedAt: number;
    jobId?: string;
}

// Get recently used tools
export function getRecentTools(): RecentTool[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(RECENT_TOOLS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// Add a tool to recently used
export function addRecentTool(tool: { id: string; name: string; icon: string }): void {
    if (typeof window === 'undefined') return;
    try {
        const recent = getRecentTools().filter(t => t.id !== tool.id);
        recent.unshift({
            id: tool.id,
            name: tool.name,
            icon: tool.icon,
            usedAt: Date.now(),
        });
        localStorage.setItem(
            RECENT_TOOLS_KEY,
            JSON.stringify(recent.slice(0, MAX_RECENT_TOOLS))
        );
    } catch {
        // Ignore storage errors
    }
}

// Get recent files
export function getRecentFiles(): RecentFile[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(RECENT_FILES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// Add a file to recent history
export function addRecentFile(file: Omit<RecentFile, 'processedAt'>): void {
    if (typeof window === 'undefined') return;
    try {
        const recent = getRecentFiles();
        recent.unshift({
            ...file,
            processedAt: Date.now(),
        });
        localStorage.setItem(
            RECENT_FILES_KEY,
            JSON.stringify(recent.slice(0, MAX_RECENT_FILES))
        );
    } catch {
        // Ignore storage errors
    }
}

// Clear recent history
export function clearRecentHistory(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(RECENT_TOOLS_KEY);
        localStorage.removeItem(RECENT_FILES_KEY);
    } catch {
        // Ignore storage errors
    }
}

// Format relative time
export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

// Format file size
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Validate file size (max 10MB for free tier)
export function validateFileSize(
    size: number,
    maxSize: number = 10 * 1024 * 1024
): { valid: boolean; message?: string } {
    if (size > maxSize) {
        return {
            valid: false,
            message: `File too large. Maximum size is ${formatFileSize(maxSize)}.`,
        };
    }
    return { valid: true };
}

// Validate file type
export function validateFileType(
    file: File,
    acceptedTypes: string[] = ['application/pdf']
): { valid: boolean; message?: string } {
    if (!acceptedTypes.includes(file.type)) {
        // Dynamic error message based on accepted types
        const isImageType = acceptedTypes.some(t => t.startsWith('image/'));
        const isPdfType = acceptedTypes.includes('application/pdf');

        let message = 'Please select a valid file.';
        if (isPdfType && !isImageType) {
            message = 'Please select a PDF file.';
        } else if (isImageType && !isPdfType) {
            message = 'Please select an image file (JPG, PNG).';
        } else if (isImageType && isPdfType) {
            message = 'Please select a PDF or image file.';
        }

        return {
            valid: false,
            message,
        };
    }
    return { valid: true };
}

