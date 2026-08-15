// Clean, high-performance tool data for PDF Tools platform

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

export const toolCategories: ToolCategory[] = [
    {
        id: 'organize',
        name: 'Organize',
        icon: '🔀',
        tools: [
            { id: 'merge', name: 'Merge', description: 'Combine multiple PDFs into one', icon: '📑', category: 'organize', status: 'active' },
            { id: 'split', name: 'Split / Extract', description: 'Extract specific pages or ranges', icon: '✂️', category: 'organize', status: 'active' },
            { id: 'delete', name: 'Delete Pages', description: 'Remove unwanted pages', icon: '🗑️', category: 'organize', status: 'active' },
            { id: 'rotate', name: 'Rotate', description: 'Change page orientation (90°, 180°, 270°)', icon: '🔄', category: 'organize', status: 'active' },
            { id: 'reorder', name: 'Reorder', description: 'Rearrange custom page sequence', icon: '↕️', category: 'organize', status: 'active' },
            { id: 'rename', name: 'Rename', description: 'Change PDF output filename', icon: '✏️', category: 'organize', status: 'active' },
            { id: 'alternate-mix', name: 'Alternate & Mix', description: 'Interleave pages from 2 PDFs', icon: '🔀', category: 'organize', status: 'active' },
        ],
    },
    {
        id: 'convert-to',
        name: 'Convert to PDF',
        icon: '📥',
        tools: [
            { id: 'image-to-pdf', name: 'Image → PDF', description: 'Convert JPG, PNG, JFIF images to PDF', icon: '🖼️', category: 'convert-to', status: 'active' },
        ],
    },
    {
        id: 'page-tools',
        name: 'Page Tools',
        icon: '📐',
        tools: [
            { id: 'page-numbers', name: 'Page Numbers', description: 'Insert page numbering into footers', icon: '🔢', category: 'page-tools', status: 'active' },
            { id: 'bates', name: 'Bates Numbering', description: 'Add sequential legal document stamps', icon: '🏷️', category: 'page-tools', status: 'active' },
            { id: 'watermark', name: 'Watermark', description: 'Add custom text overlay to pages', icon: '💧', category: 'page-tools', status: 'active' },
            { id: 'sign', name: 'Sign PDF', description: 'Draw, type, or upload digital signature', icon: '✍️', category: 'page-tools', status: 'active' },
        ],
    },
    {
        id: 'optimize',
        name: 'Optimize & Clean',
        icon: '🔧',
        tools: [
            { id: 'flatten', name: 'Flatten', description: 'Lock interactive forms into static pages', icon: '📄', category: 'optimize', status: 'active' },
            { id: 'edit-metadata', name: 'Edit Metadata', description: 'Update PDF Title, Author, and Subject', icon: '📋', category: 'optimize', status: 'active' },
        ],
    },
];

// Flat list of all tools
export const allTools: Tool[] = toolCategories.flatMap(cat => cat.tools);

// Active tools only (for UI display)
export const activeTools: Tool[] = allTools.filter(t => t.status === 'active');

// Active categories
export const activeCategories: ToolCategory[] = toolCategories
    .map(cat => ({
        ...cat,
        tools: cat.tools.filter(t => t.status === 'active')
    }))
    .filter(cat => cat.tools.length > 0);

// Quick start tools
export const quickStartTools = activeTools.filter(t =>
    ['merge', 'split', 'rotate', 'image-to-pdf'].includes(t.id)
);

// Get tool by ID
export function getToolById(id: string): Tool | undefined {
    // Also support aliases
    if (id === 'extract' || id === 'extract_pages') return allTools.find(t => t.id === 'split');
    if (id === 'delete-pages') return allTools.find(t => t.id === 'delete');
    if (id === 'organize-pages') return allTools.find(t => t.id === 'reorder');
    return allTools.find(t => t.id === id);
}

// Check if a tool is active
export function isToolActive(id: string): boolean {
    const tool = getToolById(id);
    return tool?.status === 'active';
}

// Search tools
export function searchTools(query: string): Tool[] {
    const q = query.toLowerCase().trim();
    if (!q) return activeTools;
    return activeTools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
}
