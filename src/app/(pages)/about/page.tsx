import Link from 'next/link';
import styles from '../shared.module.css';
import { useTranslation } from '../../i18n';

export default function AboutPage() {
    const { t } = useTranslation();
    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← {t('Home')}</Link>
                    <span className={styles.pageTitle}>{t('About')}</span>
                </div>
            </nav>

            <main className={styles.main}>
                {/* Hero */}
                <div className={styles.hero}>
                    <h1 className={styles.title}>{t('About PDF Tools')}</h1>
                    <p className={styles.subtitle}>
                        {t('A premium, secure platform for all your document needs. Built with privacy-first principles.')}
                    </p>
                </div>

                {/* Mission */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t('Our Mission')}</h2>
                    <p className={styles.sectionText}>
                        {t('We believe document processing should be simple, fast, and secure. Our tools are designed to handle your sensitive documents with the utmost care while providing a seamless, premium experience.')}
                    </p>
                </section>

                {/* Features */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t('Why Choose Us')}</h2>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>🔒</div>
                            <h3 className={styles.cardTitle}>{t('Secure')}</h3>
                            <p className={styles.cardText}>
                                {t('Files are encrypted and auto-deleted after processing')}
                            </p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>⚡</div>
                            <h3 className={styles.cardTitle}>{t('Fast')}</h3>
                            <p className={styles.cardText}>
                                {t('Optimized processing for quick results')}
                            </p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>🎯</div>
                            <h3 className={styles.cardTitle}>{t('Simple')}</h3>
                            <p className={styles.cardText}>
                                {t('Clean interface, no learning curve')}
                            </p>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardIcon}>💎</div>
                            <h3 className={styles.cardTitle}>{t('Premium')}</h3>
                            <p className={styles.cardText}>
                                {t('Professional-grade tools for everyone')}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t('Security First')}</h2>
                    <p className={styles.sectionText}>
                        {t('Your documents never leave our secure servers unprotected. All files are:')}
                    </p>
                    <ul className={styles.sectionText} style={{ paddingLeft: '24px' }}>
                        <li>{t('Encrypted during upload and processing')}</li>
                        <li>{t('Automatically deleted within 1 hour')}</li>
                        <li>{t('Never accessed by humans')}</li>
                        <li>{t('Processed in isolated environments')}</li>
                    </ul>
                </section>

                {/* Creator Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t('Creator')}</h2>
                    <div className={styles.card} style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className={styles.cardIcon}>👨‍💻</div>
                        <h3 className={styles.cardTitle}>{t('Om Desai')}</h3>
                        <p className={styles.cardText}>
                            {t('Built with passion to provide the best PDF processing experience.')}
                        </p>
                        <p className={styles.cardText} style={{ marginTop: '12px' }}>
                            <a
                                href="mailto:omdesai608@gmail.com"
                                style={{
                                    color: 'var(--color-primary)',
                                    textDecoration: 'none',
                                    fontWeight: 500
                                }}
                            >
                                {t('omdesai608@gmail.com')}
                            </a>
                        </p>
                    </div>
                </section>
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
                    <p>{t('© 2024 PDF Tools. All rights reserved.')}</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '8px', opacity: 0.8 }}>
                        {t('Created by')} <strong>{t('Om Desai')}</strong> • <a href="mailto:omdesai608@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>{t('omdesai608@gmail.com')}</a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
