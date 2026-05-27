'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../shared.module.css';
import { useTranslation } from '../../i18n';

export default function ContactPage() {
    const { t } = useTranslation();
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← {t('Home')}</Link>
                    <span className={styles.pageTitle}>{t('Contact')}</span>
                </div>
            </nav>

            <main className={styles.main}>
                {/* Hero */}
                <div className={styles.hero}>
                    <h1 className={styles.title}>{t('Get in Touch')}</h1>
                    <p className={styles.subtitle}>
                        {t("Have a question or feedback? We'd love to hear from you.")}
                    </p>
                </div>

                <div className={styles.contactGrid}>
                    {/* Contact Form */}
                    <div>
                        {submitted ? (
                            <div className={styles.card} style={{ textAlign: 'center', padding: '48px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                                <h3 className={styles.cardTitle}>{t('Message Sent!')}</h3>
                                <p className={styles.cardText}>
                                    {t("We'll get back to you within 24 hours.")}
                                </p>
                            </div>
                        ) : (
                            <form className={styles.form} onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('Name')}</label>
                                    <input type="text" className={styles.input} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('Email')}</label>
                                    <input type="email" className={styles.input} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('Subject')}</label>
                                    <input type="text" className={styles.input} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('Message')}</label>
                                    <textarea className={styles.textarea} required />
                                </div>
                                <button type="submit" className={styles.submitBtn}>
                                    {t('Send Message')}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Contact Info */}
                    <div className={styles.contactInfo}>
                        <div className={styles.contactCard}>
                            <h3>📧 {t('Email')}</h3>
                            <p>{t('support@pdftools.com')}</p>
                        </div>
                        <div className={styles.contactCard}>
                            <h3>💬 {t('Live Chat')}</h3>
                            <p>{t('Available 9 AM - 6 PM EST')}</p>
                        </div>
                        <div className={styles.contactCard}>
                            <h3>📍 {t('Location')}</h3>
                            <p>{t('San Francisco, CA')}</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <h3>📄 {t('PDF Tools')}</h3>
                        <p>{t('Premium document processing for everyone.')}</p>
                    </div>
                    <div className={styles.footerSection}>
                        <h4>{t('Product')}</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link href="/">{t('All Tools')}</Link></li>
                            <li><Link href="/pricing">{t('Pricing')}</Link></li>
                            <li><Link href="/faq">{t('FAQ')}</Link></li>
                        </ul>
                    </div>
                    <div className={styles.footerSection}>
                        <h4>{t('Company')}</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link href="/about">{t('About')}</Link></li>
                            <li><Link href="/contact">{t('Contact')}</Link></li>
                        </ul>
                    </div>
                    <div className={styles.footerSection}>
                        <h4>{t('Legal')}</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link href="/privacy">{t('Privacy')}</Link></li>
                            <li><Link href="/terms">{t('Terms')}</Link></li>
                        </ul>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    {t('© 2024 PDF Tools. All rights reserved.')}
                </div>
            </footer>
        </div>
    );
}
