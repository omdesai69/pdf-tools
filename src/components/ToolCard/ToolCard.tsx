'use client';

import { useState, useCallback } from 'react';
import styles from './ToolCard.module.css';

export interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    operation: string;
}

interface ToolCardProps {
    tool: Tool;
    onSelect: (tool: Tool) => void;
}

export function ToolCard({ tool, onSelect }: ToolCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            className={styles.card}
            onClick={() => onSelect(tool)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={styles.iconWrapper}>
                <span className={styles.icon}>{tool.icon}</span>
            </div>
            <h3 className={styles.name}>{tool.name}</h3>
            <p className={styles.description}>{tool.description}</p>
            <div className={`${styles.glow} ${isHovered ? styles.glowActive : ''}`} />
        </button>
    );
}

export default ToolCard;
