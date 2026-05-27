import Link from 'next/link';
import styles from '../shared.module.css';

export default function TermsPage() {
    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← Home</Link>
                    <span className={styles.pageTitle}>Terms of Service</span>
                </div>
            </nav>

            <main className={styles.main}>
                <h1 className={styles.title} style={{ marginBottom: '32px' }}>Terms of Service</h1>

                <div className={styles.legal}>
                    <p><em>Last updated: December 2024</em></p>

                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using PDF Tools, you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, please do not use our services.
                    </p>

                    <h2>2. Description of Service</h2>
                    <p>
                        PDF Tools provides online document processing services including but not limited to
                        merging, splitting, converting, and editing PDF files. We reserve the right to
                        modify or discontinue the service at any time.
                    </p>

                    <h2>3. User Responsibilities</h2>
                    <p>
                        You agree to:
                    </p>
                    <ul>
                        <li>Use the service only for lawful purposes</li>
                        <li>Not upload malicious files or content</li>
                        <li>Not attempt to circumvent usage limits</li>
                        <li>Not use automated systems to access the service</li>
                        <li>Maintain the confidentiality of your account</li>
                    </ul>

                    <h2>4. Intellectual Property</h2>
                    <p>
                        You retain all rights to documents you upload. We do not claim ownership of your
                        content. Our service, branding, and technology remain our intellectual property.
                    </p>

                    <h2>5. Limitation of Liability</h2>
                    <p>
                        PDF Tools is provided &quot;as is&quot; without warranties of any kind. We are not liable
                        for any damages arising from the use of our services, including data loss or
                        business interruption.
                    </p>

                    <h2>6. Payment Terms</h2>
                    <p>
                        Paid subscriptions are billed monthly or annually. Refunds are available within
                        7 days of purchase. Prices may change with 30 days notice.
                    </p>

                    <h2>7. Account Termination</h2>
                    <p>
                        We may terminate accounts that violate these terms. You may delete your account
                        at any time through your account settings.
                    </p>

                    <h2>8. Changes to Terms</h2>
                    <p>
                        We may update these terms from time to time. Continued use of the service after
                        changes constitutes acceptance of the new terms.
                    </p>

                    <h2>9. Governing Law</h2>
                    <p>
                        These terms are governed by the laws of the State of California, United States.
                    </p>

                    <h2>10. Contact</h2>
                    <p>
                        For questions about these terms, contact us at legal@pdftools.com.
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
