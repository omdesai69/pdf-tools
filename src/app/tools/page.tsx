'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// Tool categories with progressive disclosure
const categories = [
    {
        id: 'edit',
        name: 'Edit',
        description: 'Modify your PDFs',
        tools: [
            { id: 'merge', name: 'Merge PDF', desc: 'Combine multiple PDFs' },
            { id: 'split', name: 'Split PDF', desc: 'Separate into multiple files' },
            { id: 'delete', name: 'Delete Pages', desc: 'Remove unwanted pages' },
            { id: 'rotate', name: 'Rotate', desc: 'Change page orientation' },
            { id: 'reorder', name: 'Reorder', desc: 'Rearrange pages' },
        ],
    },
    {
        id: 'convert',
        name: 'Convert',
        description: 'Change file formats',
        tools: [
            { id: 'pdf-to-jpg', name: 'PDF to Image', desc: 'Export as JPG or PNG' },
            { id: 'jpg-to-pdf', name: 'Image to PDF', desc: 'Create PDF from images' },
        ],
    },
    {
        id: 'optimize',
        name: 'Optimize',
        description: 'Improve your files',
        tools: [
            { id: 'compress', name: 'Compress', desc: 'Reduce file size' },
        ],
    },
    {
        id: 'secure',
        name: 'Secure',
        description: 'Protect your documents',
        tools: [
            { id: 'protect', name: 'Protect', desc: 'Add password' },
            { id: 'unlock', name: 'Unlock', desc: 'Remove password' },
            { id: 'watermark', name: 'Watermark', desc: 'Add watermark' },
        ],
    },
];

export default function ToolsPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const activeCategory = categories.find(c => c.id === selectedCategory);

    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <button
                        className={styles.backButton}
                        onClick={() => selectedCategory ? setSelectedCategory(null) : router.push('/')}
                    >
                        ← {selectedCategory ? 'Categories' : 'Home'}
                    </button>
                </div>
            </nav>

            <main className={styles.main}>
                {!selectedCategory ? (
                    /* Category Selection */
                    <>
                        <h1 className={styles.title}>What would you like to do?</h1>
                        <div className={styles.categoryGrid}>
                            {categories.map((category, index) => (
                                <button
                                    key={category.id}
                                    className={styles.categoryCard}
                                    onClick={() => setSelectedCategory(category.id)}
                                    style={{ animationDelay: `${index * 80}ms` }}
                                >
                                    <h2 className={styles.categoryName}>{category.name}</h2>
                                    <p className={styles.categoryDesc}>{category.description}</p>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Tool Selection within Category */
                    <>
                        <h1 className={styles.title}>{activeCategory?.name}</h1>
                        <div className={styles.toolList}>
                            {activeCategory?.tools.map((tool, index) => (
                                <button
                                    key={tool.id}
                                    className={styles.toolRow}
                                    onClick={() => router.push(`/tools/${tool.id}`)}
                                    style={{ animationDelay: `${index * 60}ms` }}
                                >
                                    <div className={styles.toolInfo}>
                                        <span className={styles.toolName}>{tool.name}</span>
                                        <span className={styles.toolDesc}>{tool.desc}</span>
                                    </div>
                                    <span className={styles.toolArrow}>→</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
