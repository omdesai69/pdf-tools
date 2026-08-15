// Tool-specific settings configuration

export interface ToolSettings {
    // Split / Delete
    splitValue?: string; // e.g. "1-3,5,7"
    pageRange?: string;

    // Rotate
    rotationAngle?: 90 | 180 | 270 | '90' | '180' | '270';

    // Watermark
    watermarkText?: string;
    watermarkOpacity?: number;

    // Bates
    batesPrefix?: string;
    batesStartNumber?: number;

    // Rename
    newFilename?: string;

    // Metadata
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;

    // Alternate & Mix
    pageOrder?: 'sequential' | 'interleaved';

    // Signature
    signatureDataUrl?: string;
    signaturePage?: number;
    signatureX?: number;
    signatureY?: number;
    signatureWidth?: number;
    signatureHeight?: number;
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

export const toolConfigs: Record<string, ToolConfig> = {
    merge: {
        id: 'merge',
        name: 'Merge',
        description: 'Combine multiple PDFs',
        icon: '📑',
        hasSettings: false,
        acceptMultiple: true,
        maxFiles: 20,
    },
    split: {
        id: 'split',
        name: 'Split / Extract',
        description: 'Extract specific pages or ranges',
        icon: '✂️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'splitValue',
                label: 'Pages to Extract',
                type: 'text',
                placeholder: 'e.g. 1-3, 5, 8-10',
                default: '1-3',
            },
        ],
    },
    delete: {
        id: 'delete',
        name: 'Delete Pages',
        description: 'Remove specific pages',
        icon: '🗑️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'splitValue',
                label: 'Pages to Remove',
                type: 'text',
                placeholder: 'e.g. 2, 4-6',
                default: '',
            },
        ],
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
                label: 'Rotation Angle',
                type: 'select',
                options: [
                    { value: '90', label: '90° Clockwise' },
                    { value: '180', label: '180° Flip' },
                    { value: '270', label: '90° Counter-clockwise' },
                ],
                default: '90',
            },
            {
                key: 'pageRange',
                label: 'Pages to Rotate',
                type: 'text',
                placeholder: 'all or 1-3, 5',
                default: 'all',
            },
        ],
    },
    reorder: {
        id: 'reorder',
        name: 'Reorder',
        description: 'Rearrange page order',
        icon: '↕️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'splitValue',
                label: 'New Page Order',
                type: 'text',
                placeholder: 'e.g. 3, 1, 2, 4',
                default: '',
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
                key: 'newFilename',
                label: 'New Filename',
                type: 'text',
                placeholder: 'my-document (without .pdf)',
                default: '',
            },
        ],
    },
    'alternate-mix': {
        id: 'alternate-mix',
        name: 'Alternate & Mix',
        description: 'Interleave pages from 2 PDFs',
        icon: '🔀',
        hasSettings: false,
        acceptMultiple: true,
        maxFiles: 2,
    },
    'image-to-pdf': {
        id: 'image-to-pdf',
        name: 'Image → PDF',
        description: 'Convert JPG, PNG, JFIF to PDF',
        icon: '🖼️',
        hasSettings: false,
        acceptMultiple: true,
        maxFiles: 50,
    },
    'page-numbers': {
        id: 'page-numbers',
        name: 'Page Numbers',
        description: 'Insert page numbering into footers',
        icon: '🔢',
        hasSettings: false,
    },
    bates: {
        id: 'bates',
        name: 'Bates Numbering',
        description: 'Legal document numbering stamps',
        icon: '🏷️',
        hasSettings: true,
        settingsFields: [
            {
                key: 'batesPrefix',
                label: 'Prefix',
                type: 'text',
                placeholder: 'DOC-',
                default: 'DOC-',
            },
            {
                key: 'batesStartNumber',
                label: 'Starting Number',
                type: 'number',
                min: 1,
                max: 999999,
                default: 1,
            },
        ],
    },
    watermark: {
        id: 'watermark',
        name: 'Watermark',
        description: 'Add watermark text',
        icon: '💧',
        hasSettings: true,
        settingsFields: [
            {
                key: 'watermarkText',
                label: 'Watermark Text',
                type: 'text',
                placeholder: 'CONFIDENTIAL',
                default: 'CONFIDENTIAL',
            },
            {
                key: 'watermarkOpacity',
                label: 'Opacity (%)',
                type: 'range',
                min: 10,
                max: 100,
                default: 30,
            },
        ],
    },
    flatten: {
        id: 'flatten',
        name: 'Flatten',
        description: 'Lock forms into static pages',
        icon: '📄',
        hasSettings: false,
    },
    'edit-metadata': {
        id: 'edit-metadata',
        name: 'Edit Metadata',
        description: 'Update PDF metadata',
        icon: '📋',
        hasSettings: true,
        settingsFields: [
            {
                key: 'title',
                label: 'Title',
                type: 'text',
                placeholder: 'Document Title',
                default: '',
            },
            {
                key: 'author',
                label: 'Author',
                type: 'text',
                placeholder: 'Author Name',
                default: '',
            },
            {
                key: 'subject',
                label: 'Subject',
                type: 'text',
                placeholder: 'Subject / Topic',
                default: '',
            },
        ],
    },
    sign: {
        id: 'sign',
        name: 'Sign PDF',
        description: 'Draw, type, or upload digital signature',
        icon: '✍️',
        hasSettings: true,
    },
    'dark-mode': {
        id: 'dark-mode',
        name: 'Dark Mode PDF',
        description: 'Invert colors for night reading',
        icon: '🌑',
        hasSettings: false,
    },
    sanitize: {
        id: 'sanitize',
        name: 'Sanitize PDF',
        description: 'Scrub all hidden tracking metadata',
        icon: '🛡️',
        hasSettings: false,
    },
    booklet: {
        id: 'booklet',
        name: 'Booklet Imposition',
        description: 'Format pages for 2-sided booklet print',
        icon: '📖',
        hasSettings: false,
    },
};

export function getToolConfig(toolId: string): ToolConfig {
    return toolConfigs[toolId] || {
        id: toolId,
        name: toolId,
        description: '',
        icon: '📄',
        hasSettings: false,
    };
}
