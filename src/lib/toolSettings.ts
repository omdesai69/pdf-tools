// Tool-specific settings configuration

export interface ToolSettings {
    // Compression
    compressionLevel?: 'low' | 'medium' | 'high';

    // Split
    splitMode?: 'pages' | 'range' | 'size';
    splitValue?: string; // e.g., "1-3,5,7-10" or "5MB"

    // Merge
    pageOrder?: 'sequential' | 'interleaved';

    // OCR
    ocrLanguage?: string;

    // Watermark
    watermarkText?: string;
    watermarkPosition?: 'center' | 'corner';
    watermarkOpacity?: number;

    // Page range (for many tools)
    pageRange?: string; // e.g., "1-5" or "all"

    // N-up
    pagesPerSheet?: 2 | 4 | 6 | 9;

    // Rotate
    rotationAngle?: 90 | 180 | 270;
}

export interface ToolConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    hasSettings: boolean;
    settingsFields?: SettingsField[];
    acceptMultiple?: boolean;
    maxFiles?: number;
}

export interface SettingsField {
    key: keyof ToolSettings;
    label: string;
    type: 'select' | 'text' | 'range' | 'number';
    options?: { value: string; label: string }[];
    default?: string | number;
    placeholder?: string;
    min?: number;
    max?: number;
}

// Tool configurations with settings
export const toolConfigs: Record<string, ToolConfig> = {
    compress: {
        id: 'compress',
        name: 'Compress',
        description: 'Reduce file size',
        icon: '📦',
        hasSettings: true,
        settingsFields: [
            {
                key: 'compressionLevel',
                label: 'Compression Level',
                type: 'select',
                options: [
                    { value: 'low', label: 'Low (best quality)' },
                    { value: 'medium', label: 'Medium (balanced)' },
                    { value: 'high', label: 'High (smallest size)' },
                ],
                default: 'medium',
            },
        ],
    },
    split: {
        id: 'split',
        name: 'Split',
        description: 'Separate into files',
        icon: '✂️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'splitValue',
                label: 'Pages to Extract',
                type: 'text',
                placeholder: 'Type "1-3" for first 3 pages',
                default: '',
            },
        ],
    },
    merge: {
        id: 'merge',
        name: 'Merge',
        description: 'Combine multiple PDFs',
        icon: '📑',
        hasSettings: false,
        acceptMultiple: true,
        maxFiles: 20,
    },
    rotate: {
        id: 'rotate',
        name: 'Rotate',
        description: 'Change orientation',
        icon: '🔄',
        hasSettings: true,
        settingsFields: [
            {
                key: 'rotationAngle',
                label: 'Rotation',
                type: 'select',
                options: [
                    { value: '90', label: '90° Clockwise' },
                    { value: '180', label: '180°' },
                    { value: '270', label: '90° Counter-clockwise' },
                ],
                default: '90',
            },
            {
                key: 'pageRange',
                label: 'Pages',
                type: 'text',
                placeholder: 'all or 1-3,5',
                default: 'all',
            },
        ],
    },
    ocr: {
        id: 'ocr',
        name: 'OCR',
        description: 'Make scans searchable',
        icon: '👁️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'ocrLanguage',
                label: 'Language',
                type: 'select',
                options: [
                    { value: 'eng', label: 'English' },
                    { value: 'fra', label: 'French' },
                    { value: 'deu', label: 'German' },
                    { value: 'spa', label: 'Spanish' },
                    { value: 'ita', label: 'Italian' },
                    { value: 'por', label: 'Portuguese' },
                    { value: 'chi_sim', label: 'Chinese (Simplified)' },
                    { value: 'jpn', label: 'Japanese' },
                    { value: 'kor', label: 'Korean' },
                    { value: 'ara', label: 'Arabic' },
                    { value: 'hin', label: 'Hindi' },
                ],
                default: 'eng',
            },
        ],
    },
    watermark: {
        id: 'watermark',
        name: 'Watermark',
        description: 'Add text/image overlay',
        icon: '💧',
        hasSettings: true,
        settingsFields: [
            {
                key: 'watermarkText',
                label: 'Watermark Text',
                type: 'text',
                placeholder: 'CONFIDENTIAL',
                default: '',
            },
            {
                key: 'watermarkPosition',
                label: 'Position',
                type: 'select',
                options: [
                    { value: 'center', label: 'Center' },
                    { value: 'corner', label: 'Corner' },
                ],
                default: 'center',
            },
            {
                key: 'watermarkOpacity',
                label: 'Opacity',
                type: 'range',
                min: 10,
                max: 100,
                default: 30,
            },
        ],
    },
    nup: {
        id: 'nup',
        name: 'N-up',
        description: 'Multiple pages per sheet',
        icon: '🔲',
        hasSettings: true,
        settingsFields: [
            {
                key: 'pagesPerSheet',
                label: 'Pages per Sheet',
                type: 'select',
                options: [
                    { value: '2', label: '2 pages' },
                    { value: '4', label: '4 pages' },
                    { value: '6', label: '6 pages' },
                    { value: '9', label: '9 pages' },
                ],
                default: '4',
            },
        ],
    },
    rename: {
        id: 'rename',
        name: 'Rename',
        description: 'Change PDF filename',
        icon: '✏️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'watermarkText' as keyof ToolSettings, // Reusing for filename
                label: 'New Filename',
                type: 'text',
                placeholder: 'Enter new filename (without .pdf)',
                default: '',
            },
        ],
    },
    'alternate-mix': {
        id: 'alternate-mix',
        name: 'Alternate & Mix',
        description: 'Merge by interleaving pages',
        icon: '🔀',
        hasSettings: true,
        acceptMultiple: true,
        maxFiles: 10,
        settingsFields: [
            {
                key: 'pageOrder',
                label: 'Interleave Order',
                type: 'select',
                options: [
                    { value: 'sequential', label: 'Odd pages first' },
                    { value: 'interleaved', label: 'Alternating 1:1' },
                ],
                default: 'interleaved',
            },
        ],
    },
    'pdf-to-jpg': {
        id: 'pdf-to-jpg',
        name: 'PDF → JPG',
        description: 'Export pages as images',
        icon: '🖼️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'compressionLevel',
                label: 'Image Quality',
                type: 'select',
                options: [
                    { value: 'low', label: 'Low (faster, smaller)' },
                    { value: 'medium', label: 'Medium (balanced)' },
                    { value: 'high', label: 'High (best quality)' },
                ],
                default: 'high',
            },
            {
                key: 'pageRange',
                label: 'Pages to Export',
                type: 'text',
                placeholder: 'all or 1-3,5',
                default: 'all',
            },
        ],
    },
    'organize-pages': {
        id: 'organize-pages',
        name: 'Organize',
        description: 'Visual page organizer',
        icon: '📋',
        hasSettings: false,
    },
    'delete-pages': {
        id: 'delete-pages',
        name: 'Delete Pages',
        description: 'Remove unwanted pages',
        icon: '🗑️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'pageRange',
                label: 'Pages to Delete',
                type: 'text',
                placeholder: 'e.g., 1,3,5-7',
                default: '',
            },
        ],
    },
    'image-to-pdf': {
        id: 'image-to-pdf',
        name: 'Image → PDF',
        description: 'Create PDF from images',
        icon: '🖼️',
        hasSettings: false,
        acceptMultiple: true,
        maxFiles: 50,
    },
};

// Get config for a tool, with defaults for tools without specific config
export function getToolConfig(toolId: string): ToolConfig {
    return toolConfigs[toolId] || {
        id: toolId,
        name: toolId,
        description: '',
        icon: '📄',
        hasSettings: false,
    };
}
