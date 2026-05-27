// Complete tool data for PDF Tools platform
// 35 tools across 11 categories

export type ToolStatus = 'active' | 'hidden';

export interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    status: ToolStatus;
}

export interface ToolCategory {
    id: string;
    name: string;
    icon: string;
    tools: Tool[];
}

// All tools organized by category
export const toolCategories: ToolCategory[] = [
    {
        id: 'organize',
        name: 'Organize',
        icon: '🔀',
        tools: [
            { id: 'merge', name: 'Merge', description: 'Combine multiple PDFs', icon: '📑', category: 'organize', status: 'active' },
            { id: 'split', name: 'Split', description: 'Separate into files', icon: '✂️', category: 'organize', status: 'active' },
            { id: 'delete', name: 'Delete Pages', description: 'Remove specific pages', icon: '🗑️', category: 'organize', status: 'active' },
            { id: 'rotate', name: 'Rotate', description: 'Change orientation', icon: '🔄', category: 'organize', status: 'active' },
            { id: 'reorder', name: 'Reorder', description: 'Rearrange page order', icon: '↕️', category: 'organize', status: 'active' },
            { id: 'extract', name: 'Extract Pages', description: 'Pull out specific pages', icon: '📤', category: 'organize', status: 'active' },
            { id: 'crop', name: 'Crop', description: 'Trim page margins', icon: '✂️', category: 'organize', status: 'hidden' },
            { id: 'rename', name: 'Rename', description: 'Change PDF filename', icon: '✏️', category: 'organize', status: 'active' },
            { id: 'alternate-mix', name: 'Alternate & Mix', description: 'Merge by interleaving', icon: '🔀', category: 'organize', status: 'active' },
        ],
    },
    {
        id: 'convert-from',
        name: 'Convert from PDF',
        icon: '📤',
        tools: [
            { id: 'pdf-to-word', name: 'PDF → Word', description: 'Export to .docx', icon: '📘', category: 'convert-from', status: 'hidden' },
            { id: 'pdf-to-excel', name: 'PDF → Excel', description: 'Export to .xlsx', icon: '📊', category: 'convert-from', status: 'hidden' },
            { id: 'pdf-to-ppt', name: 'PDF → PowerPoint', description: 'Export to .pptx', icon: '📽️', category: 'convert-from', status: 'hidden' },
            { id: 'pdf-to-text', name: 'PDF → Text', description: 'Extract plain text', icon: '📄', category: 'convert-from', status: 'hidden' },
            { id: 'pdf-to-jpg', name: 'PDF → JPG', description: 'Export as images', icon: '🖼️', category: 'convert-from', status: 'hidden' },
        ],
    },
    {
        id: 'convert-to',
        name: 'Convert to PDF',
        icon: '📥',
        tools: [
            { id: 'word-to-pdf', name: 'Word → PDF', description: 'Convert from .docx', icon: '📘', category: 'convert-to', status: 'hidden' },
            { id: 'image-to-pdf', name: 'Image → PDF', description: 'Create from images', icon: '🖼️', category: 'convert-to', status: 'active' },
            { id: 'html-to-pdf', name: 'HTML → PDF', description: 'Capture web pages', icon: '🌐', category: 'convert-to', status: 'hidden' },
        ],
    },
    {
        id: 'page-tools',
        name: 'Page Tools',
        icon: '📐',
        tools: [
            { id: 'resize', name: 'Resize', description: 'Change dimensions', icon: '↔️', category: 'page-tools', status: 'hidden' },
            { id: 'nup', name: 'N-up', description: 'Multiple pages per sheet', icon: '🔲', category: 'page-tools', status: 'hidden' },
            { id: 'header-footer', name: 'Header & Footer', description: 'Add page headers', icon: '📋', category: 'page-tools', status: 'active' },
            { id: 'page-numbers', name: 'Page Numbers', description: 'Insert numbering', icon: '🔢', category: 'page-tools', status: 'active' },
            { id: 'bates', name: 'Bates Numbering', description: 'Legal document stamps', icon: '🏷️', category: 'page-tools', status: 'active' },
            { id: 'watermark', name: 'Watermark', description: 'Add text/image overlay', icon: '💧', category: 'page-tools', status: 'active' },
        ],
    },
    {
        id: 'optimize',
        name: 'Optimize & Repair',
        icon: '🔧',
        tools: [
            { id: 'compress', name: 'Compress', description: 'Reduce file size', icon: '📦', category: 'optimize', status: 'active' },
            { id: 'repair', name: 'Repair', description: 'Fix corrupted files', icon: '🔧', category: 'optimize', status: 'active' },
            { id: 'grayscale', name: 'Grayscale', description: 'Convert to B&W', icon: '🌑', category: 'optimize', status: 'hidden' },
            { id: 'flatten', name: 'Flatten', description: 'Merge layers', icon: '📄', category: 'optimize', status: 'active' },
        ],
    },
    {
        id: 'extract-cleanup',
        name: 'Extract & Cleanup',
        icon: '📊',
        tools: [
            { id: 'extract-images', name: 'Extract Images', description: 'Pull out all images', icon: '🖼️', category: 'extract-cleanup', status: 'hidden' },
            { id: 'remove-annotations', name: 'Remove Annotations', description: 'Strip comments', icon: '🧹', category: 'extract-cleanup', status: 'hidden' },
            { id: 'edit-metadata', name: 'Edit Metadata', description: 'Modify file info', icon: '📋', category: 'extract-cleanup', status: 'active' },
            { id: 'create-bookmarks', name: 'Create Bookmarks', description: 'Add navigation', icon: '🔖', category: 'extract-cleanup', status: 'hidden' },
        ],
    },
    {
        id: 'security',
        name: 'Security',
        icon: '🔒',
        tools: [
            { id: 'protect', name: 'Protect', description: 'Add password', icon: '🔒', category: 'security', status: 'hidden' },
            { id: 'unlock', name: 'Unlock', description: 'Remove password', icon: '🔓', category: 'security', status: 'hidden' },
            { id: 'redact', name: 'Redact', description: 'Permanently hide content', icon: '⬛', category: 'security', status: 'hidden' },
        ],
    },
    // Hidden categories - no active tools
    {
        id: 'edit-sign',
        name: 'Edit & Sign',
        icon: '✏️',
        tools: [
            { id: 'edit', name: 'Edit PDF', description: 'Modify text & images', icon: '✏️', category: 'edit-sign', status: 'hidden' },
            { id: 'fill-sign', name: 'Fill & Sign', description: 'Complete forms, add signatures', icon: '✍️', category: 'edit-sign', status: 'hidden' },
            { id: 'create-forms', name: 'Create Forms', description: 'Build interactive forms', icon: '📝', category: 'edit-sign', status: 'hidden' },
            { id: 'annotate', name: 'Annotate', description: 'Add comments & markup', icon: '💬', category: 'edit-sign', status: 'hidden' },
            { id: 'organize-pages', name: 'Organize', description: 'Visual page organizer', icon: '📋', category: 'edit-sign', status: 'active' },
            { id: 'delete-pages', name: 'Delete Pages', description: 'Remove unwanted pages', icon: '🗑️', category: 'edit-sign', status: 'active' },
        ],
    },
    {
        id: 'advanced-split',
        name: 'Advanced Split',
        icon: '✂️',
        tools: [
            { id: 'split-pages', name: 'Split by Pages', description: 'Every N pages', icon: '📄', category: 'advanced-split', status: 'active' },
            { id: 'split-bookmarks', name: 'Split by Bookmarks', description: 'At bookmark points', icon: '🔖', category: 'advanced-split', status: 'active' },
            { id: 'split-half', name: 'Split in Half', description: 'Two equal parts', icon: '➗', category: 'advanced-split', status: 'active' },
            { id: 'split-size', name: 'Split by Size', description: 'Max file size', icon: '📦', category: 'advanced-split', status: 'active' },
            { id: 'split-text', name: 'Split by Text', description: 'At text markers', icon: '🔍', category: 'advanced-split', status: 'active' },
        ],
    },
    {
        id: 'scan-ocr',
        name: 'Scan & OCR',
        icon: '📸',
        tools: [
            { id: 'ocr', name: 'OCR', description: 'Make scans searchable', icon: '👁️', category: 'scan-ocr', status: 'hidden' },
            { id: 'deskew', name: 'Deskew', description: 'Straighten pages', icon: '📐', category: 'scan-ocr', status: 'hidden' },
        ],
    },
    {
        id: 'automate',
        name: 'Automate',
        icon: '🤖',
        tools: [
            { id: 'workflows', name: 'Workflows', description: 'Multi-step pipelines', icon: '⚡', category: 'automate', status: 'hidden' },
        ],
    },
];

// Flat list of all tools (for internal use)
export const allTools: Tool[] = toolCategories.flatMap(cat => cat.tools);

// Active tools only (for UI display)
export const activeTools: Tool[] = allTools.filter(t => t.status === 'active');

// Active categories with only active tools (for UI display)
export const activeCategories: ToolCategory[] = toolCategories
    .map(cat => ({
        ...cat,
        tools: cat.tools.filter(t => t.status === 'active')
    }))
    .filter(cat => cat.tools.length > 0);

// Quick start tools (most popular - only active ones)
export const quickStartTools = activeTools.filter(t =>
    ['merge', 'compress', 'split', 'image-to-pdf'].includes(t.id)
);

// Get tool by ID (returns any tool for routing purposes)
export function getToolById(id: string): Tool | undefined {
    return allTools.find(t => t.id === id);
}

// Check if a tool is active
export function isToolActive(id: string): boolean {
    const tool = getToolById(id);
    return tool?.status === 'active';
}

// Search tools (only active tools)
export function searchTools(query: string): Tool[] {
    const q = query.toLowerCase();
    return activeTools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
}
