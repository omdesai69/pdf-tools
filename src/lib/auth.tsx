'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// User types
export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    tier: 'free' | 'pro' | 'enterprise';
    createdAt: number;
}

export interface UsageStats {
    filesProcessedToday: number;
    totalFilesProcessed: number;
    lastResetDate: string; // YYYY-MM-DD
}

export interface ProcessedFile {
    id: string;
    name: string;
    size: number;
    toolId: string;
    toolName: string;
    processedAt: number;
    expiresAt: number;
    downloadUrl?: string;
}

// Tier limits
export const TIER_LIMITS = {
    free: {
        filesPerDay: 5,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        historyDays: 1,
    },
    pro: {
        filesPerDay: Infinity,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        historyDays: 30,
    },
    enterprise: {
        filesPerDay: Infinity,
        maxFileSize: Infinity,
        historyDays: 365,
    },
};

// Context type
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    usage: UsageStats;
    history: ProcessedFile[];
    login: (email: string, name: string) => void;
    signup: (email: string, name: string) => void;
    logout: () => void;
    canProcessFile: () => { allowed: boolean; reason?: string };
    recordFileProcessed: (file: Omit<ProcessedFile, 'id' | 'processedAt' | 'expiresAt'>) => void;
    clearHistory: () => void;
    upgradeToPro: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const USER_KEY = 'pdf-tools-user';
const USAGE_KEY = 'pdf-tools-usage';
const HISTORY_KEY = 'pdf-tools-history';

// Helper to get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

// AuthProvider component
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [usage, setUsage] = useState<UsageStats>({
        filesProcessedToday: 0,
        totalFilesProcessed: 0,
        lastResetDate: '', // Will be set in useEffect
    });
    const [history, setHistory] = useState<ProcessedFile[]>([]);

    // Mark as mounted (for hydration safety)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Load from localStorage on mount
    useEffect(() => {
        const today = getTodayString();
        try {
            const savedUser = localStorage.getItem(USER_KEY);
            const savedUsage = localStorage.getItem(USAGE_KEY);
            const savedHistory = localStorage.getItem(HISTORY_KEY);

            if (savedUser) setUser(JSON.parse(savedUser));

            if (savedUsage) {
                const parsedUsage = JSON.parse(savedUsage);
                // Reset daily count if it's a new day
                if (parsedUsage.lastResetDate !== today) {
                    parsedUsage.filesProcessedToday = 0;
                    parsedUsage.lastResetDate = today;
                }
                setUsage(parsedUsage);
            } else {
                // Initialize with today's date
                setUsage(prev => ({
                    ...prev,
                    lastResetDate: today,
                }));
            }

            if (savedHistory) {
                // Filter out expired files
                const now = Date.now();
                const validHistory = JSON.parse(savedHistory).filter(
                    (f: ProcessedFile) => f.expiresAt > now
                );
                setHistory(validHistory);
            }
        } catch (e) {
            console.error('Error loading auth state:', e);
            // Still set the date on error
            setUsage(prev => ({
                ...prev,
                lastResetDate: today,
            }));
        }
        setIsLoading(false);
    }, []);

    // Save to localStorage when state changes
    useEffect(() => {
        if (!isLoading && isMounted) {
            if (user) {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            } else {
                localStorage.removeItem(USER_KEY);
            }
            localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
    }, [user, usage, history, isLoading, isMounted]);

    // Login (mock - simulates Google/Apple login)
    const login = (email: string, name: string) => {
        const newUser: User = {
            id: Math.random().toString(36).substring(7),
            email,
            name,
            tier: 'free',
            createdAt: Date.now(),
        };
        setUser(newUser);
    };

    // Signup (mock - creates new account)
    const signup = (email: string, name: string) => {
        const newUser: User = {
            id: Math.random().toString(36).substring(7),
            email,
            name,
            tier: 'free',
            createdAt: Date.now(),
        };
        setUser(newUser);
    };

    // Logout
    const logout = () => {
        setUser(null);
    };

    // Check if user can process another file
    const canProcessFile = (): { allowed: boolean; reason?: string } => {
        const tier = user?.tier || 'free';
        const limit = TIER_LIMITS[tier].filesPerDay;

        // Reset daily count if new day
        if (usage.lastResetDate !== getTodayString()) {
            setUsage(prev => ({
                ...prev,
                filesProcessedToday: 0,
                lastResetDate: getTodayString(),
            }));
            return { allowed: true };
        }

        if (usage.filesProcessedToday >= limit) {
            return {
                allowed: false,
                reason: `Daily limit reached (${limit} files). Upgrade to Pro for unlimited.`,
            };
        }

        return { allowed: true };
    };

    // Record a processed file
    const recordFileProcessed = (file: Omit<ProcessedFile, 'id' | 'processedAt' | 'expiresAt'>) => {
        const tier = user?.tier || 'free';
        const historyDays = TIER_LIMITS[tier].historyDays;

        const newFile: ProcessedFile = {
            ...file,
            id: Math.random().toString(36).substring(7),
            processedAt: Date.now(),
            expiresAt: Date.now() + (historyDays * 24 * 60 * 60 * 1000),
        };

        setHistory(prev => [newFile, ...prev].slice(0, 100)); // Keep max 100 items

        setUsage(prev => ({
            ...prev,
            filesProcessedToday: prev.filesProcessedToday + 1,
            totalFilesProcessed: prev.totalFilesProcessed + 1,
        }));
    };

    // Clear history
    const clearHistory = () => {
        setHistory([]);
    };

    // Upgrade to Pro (mock)
    const upgradeToPro = () => {
        if (user) {
            setUser({ ...user, tier: 'pro' });
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                usage,
                history,
                login,
                signup,
                logout,
                canProcessFile,
                recordFileProcessed,
                clearHistory,
                upgradeToPro,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Export tier limits for use elsewhere
export { TIER_LIMITS as tierLimits };
