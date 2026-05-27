'use client';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function HistoryPage() {
    const { user, history, usage, clearHistory, logout } = useAuth();
    const router = useRouter();

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatRelativeTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return formatDate(timestamp);
    };

    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← Home</Link>
                    <span className={styles.pageTitle}>History</span>
                </div>
            </nav>

            <main className={styles.main}>
                {/* User Info */}
                <div className={styles.userCard}>
                    {user ? (
                        <>
                            <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{user.name}</span>
                                <span className={styles.userTier}>{user.tier.toUpperCase()}</span>
                            </div>
                            <button className={styles.logoutBtn} onClick={logout}>
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <div className={styles.avatar}>👤</div>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>Guest</span>
                                <span className={styles.userTier}>FREE</span>
                            </div>
                            <button
                                className={styles.loginBtn}
                                onClick={() => router.push('/login')}
                            >
                                Sign in
                            </button>
                        </>
                    )}
                </div>

                {/* Usage Stats */}
                <div className={styles.statsCard}>
                    <h2 className={styles.sectionTitle}>Today&apos;s Usage</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{usage.filesProcessedToday}</span>
                            <span className={styles.statLabel}>
                                / {user?.tier === 'pro' ? '∞' : '5'} files today
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{usage.totalFilesProcessed}</span>
                            <span className={styles.statLabel}>total processed</span>
                        </div>
                    </div>
                    {user?.tier === 'free' && usage.filesProcessedToday >= 3 && (
                        <div className={styles.limitWarning}>
                            ⚠️ You&apos;ve used {usage.filesProcessedToday}/5 free files today
                        </div>
                    )}
                </div>

                {/* File History */}
                <div className={styles.historySection}>
                    <div className={styles.historyHeader}>
                        <h2 className={styles.sectionTitle}>Recent Files</h2>
                        {history.length > 0 && (
                            <button className={styles.clearBtn} onClick={clearHistory}>
                                Clear all
                            </button>
                        )}
                    </div>

                    {history.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>📄</span>
                            <p>No files processed yet</p>
                            <Link href="/" className={styles.ctaLink}>
                                Process your first file →
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.historyList}>
                            {history.map((file) => (
                                <div key={file.id} className={styles.historyItem}>
                                    <div className={styles.fileInfo}>
                                        <span className={styles.fileName}>{file.name}</span>
                                        <span className={styles.fileMeta}>
                                            {file.toolName} • {formatSize(file.size)} • {formatRelativeTime(file.processedAt)}
                                        </span>
                                    </div>
                                    <div className={styles.fileActions}>
                                        {file.downloadUrl ? (
                                            <a href={file.downloadUrl} className={styles.downloadLink}>
                                                Download
                                            </a>
                                        ) : (
                                            <span className={styles.expiredLabel}>Expired</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upgrade CTA (for free users) */}
                {(!user || user.tier === 'free') && (
                    <div className={styles.upgradeCard}>
                        <h3>Upgrade to Pro</h3>
                        <ul className={styles.proFeatures}>
                            <li>✓ Unlimited files per day</li>
                            <li>✓ 100 MB file size limit</li>
                            <li>✓ 30-day file history</li>
                            <li>✓ Priority processing</li>
                        </ul>
                        <Link href="/pricing" className={styles.upgradeBtn}>
                            Upgrade for $9/mo
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
