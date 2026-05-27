'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import styles from './page.module.css';

export default function LoginPage() {
    const { login, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already logged in
    if (user) {
        router.push('/history');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate login delay
        await new Promise(resolve => setTimeout(resolve, 500));

        login(email, name);
        router.push('/history');
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        // Simulate Google OAuth
        await new Promise(resolve => setTimeout(resolve, 800));
        login('user@gmail.com', 'Google User');
        router.push('/history');
    };

    const handleAppleLogin = async () => {
        setIsLoading(true);
        // Simulate Apple OAuth
        await new Promise(resolve => setTimeout(resolve, 800));
        login('user@icloud.com', 'Apple User');
        router.push('/history');
    };

    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← Home</Link>
                    <span className={styles.pageTitle}>Sign In</span>
                </div>
            </nav>

            <main className={styles.main}>
                <div className={styles.loginCard}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Welcome</h1>
                        <p className={styles.subtitle}>
                            Sign in to save your history and get higher limits.
                        </p>
                    </div>

                    {/* Social Login Buttons */}
                    <div className={styles.socialButtons}>
                        <button
                            className={styles.googleBtn}
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        <button
                            className={styles.appleBtn}
                            onClick={handleAppleLogin}
                            disabled={isLoading}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                            Continue with Apple
                        </button>
                    </div>

                    <div className={styles.divider}>
                        <span>or</span>
                    </div>

                    {/* Email Form */}
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email</label>
                            <input
                                type="email"
                                className={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@email.com"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className={styles.disclaimer}>
                        By signing in, you agree to our{' '}
                        <Link href="/terms">Terms</Link> and{' '}
                        <Link href="/privacy">Privacy Policy</Link>.
                    </p>

                    <p className={styles.disclaimer} style={{ marginTop: '16px' }}>
                        Don't have an account?{' '}
                        <Link href="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                            Sign up
                        </Link>
                    </p>
                </div>

                {/* Benefits */}
                <div className={styles.benefits}>
                    <h3>Why sign in?</h3>
                    <ul>
                        <li>📊 Track your processing history</li>
                        <li>📈 Higher usage limits</li>
                        <li>🔄 Re-download recent files</li>
                        <li>⚡ Priority processing</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
