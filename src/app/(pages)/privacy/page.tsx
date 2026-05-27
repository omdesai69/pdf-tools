import Link from 'next/link';
import styles from '../shared.module.css';

export default function PrivacyPage() {
    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← Home</Link>
                    <span className={styles.pageTitle}>Privacy Policy</span>
                </div>
            </nav>

            <main className={styles.main}>
                <h1 className={styles.title} style={{ marginBottom: '32px' }}>Privacy Policy</h1>

                <div className={styles.legal}>
                    <p><em>Last updated: December 2024</em></p>

                    <h2>1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, including:
                    </p>
                    <ul>
                        <li>Files you upload for processing</li>
                        <li>Account information (if you create an account)</li>
                        <li>Contact information when you reach out to us</li>
                        <li>Usage data and analytics</li>
                    </ul>

                    <h2>2. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to:
                    </p>
                    <ul>
                        <li>Process your documents according to your requests</li>
                        <li>Provide, maintain, and improve our services</li>
                        <li>Send you technical notices and support messages</li>
                        <li>Respond to your comments and questions</li>
                    </ul>

                    <h2>3. File Security</h2>
                    <p>
                        Your files are encrypted during upload and processing. All files are
                        automatically deleted from our servers within 1 hour after processing.
                        We do not access, view, or share your files with third parties.
                    </p>

                    <h2>4. Data Retention</h2>
                    <p>
                        Uploaded files: Deleted within 1 hour<br />
                        Account data: Retained until account deletion<br />
                        Usage analytics: Retained for 12 months
                    </p>

                    <h2>5. Your Rights</h2>
                    <p>
                        You have the right to:
                    </p>
                    <ul>
                        <li>Access your personal data</li>
                        <li>Request deletion of your data</li>
                        <li>Opt out of marketing communications</li>
                        <li>Export your data</li>
                    </ul>

                    <h2>6. Cookies</h2>
                    <p>
                        We use essential cookies to provide our services and analytics cookies
                        to understand usage patterns. You can disable cookies in your browser settings.
                    </p>

                    <h2>7. Contact Us</h2>
                    <p>
                        If you have questions about this Privacy Policy, please contact us at
                        privacy@pdftools.com.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <h3>📄 PDF Tools</h3>
                        <p>Premium document processing for everyone.</p>
                    </div>
                    <div className={styles.footerSection}>
                        <h4>Product</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link href="/">All Tools</Link></li>
                            <li><Link href="/pricing">Pricing</Link></li>
                            <li><Link href="/faq">FAQ</Link></li>
                        </ul>
                    </div>
                    <div className={styles.footerSection}>
                        <h4>Company</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link href="/about">About</Link></li>
                            <li><Link href="/contact">Contact</Link></li>
                        </ul>
                    </div>
                    <div className={styles.footerSection}>
                        <h4>Legal</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link href="/privacy">Privacy</Link></li>
                            <li><Link href="/terms">Terms</Link></li>
                        </ul>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    © 2024 PDF Tools. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
