'use client';

import { useTheme, Theme } from '@/lib/theme';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
    className?: string;
}

/**
 * Theme Toggle Component
 * 
 * Displays current theme and allows switching between light/dark/system.
 * Shows icons for each mode.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        const themes: Theme[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    };

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return '☀️';
            case 'dark':
                return '🌙';
            case 'system':
                return '💻';
        }
    };

    const getLabel = () => {
        switch (theme) {
            case 'light':
                return 'Light';
            case 'dark':
                return 'Dark';
            case 'system':
                return 'System';
        }
    };

    return (
        <button
            onClick={cycleTheme}
            className={`${styles.toggle} ${className || ''}`}
            title={`Theme: ${getLabel()}. Click to change.`}
            aria-label={`Current theme: ${getLabel()}. Click to cycle themes.`}
        >
            <span className={styles.icon}>{getIcon()}</span>
            <span className={styles.label}>{getLabel()}</span>
        </button>
    );
}

/**
 * Compact version - just icon
 */
export function ThemeToggleIcon({ className }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        const themes: Theme[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
    };

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return '☀️';
            case 'dark':
                return '🌙';
            case 'system':
                return '💻';
        }
    };

    return (
        <button
            onClick={cycleTheme}
            className={`${styles.iconOnly} ${className || ''}`}
            title={`Theme: ${theme}. Click to change.`}
            aria-label={`Current theme: ${theme}. Click to cycle themes.`}
        >
            {getIcon()}
        </button>
    );
}
