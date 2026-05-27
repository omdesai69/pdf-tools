import Link from 'next/link';
import styles from '../shared.module.css';

export default function PricingPage() {
    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← Home</Link>
                    <span className={styles.pageTitle}>Pricing</span>
                </div>
            </nav>

            <main className={styles.main}>
                {/* Hero */}
                <div className={styles.hero}>
                    <h1 className={styles.title}>Simple Pricing</h1>
                    <p className={styles.subtitle}>
                        Start free, upgrade when you need more.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className={styles.pricingGrid}>
                    {/* Free Plan */}
                    <div className={styles.pricingCard}>
                        <h3 className={styles.planName}>Free</h3>
                        <div className={styles.price}>
                            $0<span className={styles.priceUnit}>/mo</span>
                        </div>
                        <p className={styles.planDesc}>Perfect for occasional use</p>
                        <ul className={styles.featureList}>
                            <li>5 files per day</li>
                            <li>10 MB max file size</li>
                            <li>Basic tools</li>
                            <li>Auto-delete after 1 hour</li>
                        </ul>
                        <button className={styles.ctaButton}>Get Started</button>
                    </div>

                    {/* Pro Plan */}
                    <div className={`${styles.pricingCard} ${styles.featured}`}>
                        <h3 className={styles.planName}>Pro</h3>
                        <div className={styles.price}>
                            $9<span className={styles.priceUnit}>/mo</span>
                        </div>
                        <p className={styles.planDesc}>For power users & professionals</p>
                        <ul className={styles.featureList}>
                            <li>Unlimited files</li>
                            <li>100 MB max file size</li>
                            <li>All tools including OCR</li>
                            <li>Priority processing</li>
                            <li>Batch processing</li>
                            <li>File history (30 days)</li>
                        </ul>
                        <button className={styles.ctaButton}>Upgrade to Pro</button>
                    </div>

                    {/* Enterprise */}
                    <div className={styles.pricingCard}>
                        <h3 className={styles.planName}>Enterprise</h3>
                        <div className={styles.price}>Custom</div>
                        <p className={styles.planDesc}>For teams & organizations</p>
                        <ul className={styles.featureList}>
                            <li>Everything in Pro</li>
                            <li>Unlimited file size</li>
                            <li>API access</li>
                            <li>Team management</li>
                            <li>Custom integration</li>
                            <li>Dedicated support</li>
                        </ul>
                        <button className={styles.ctaButton}>Contact Sales</button>
                    </div>
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
