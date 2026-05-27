'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../shared.module.css';

const faqs = [
    {
        question: 'Is my data secure?',
        answer: 'Yes. All files are encrypted during upload and processing. Files are automatically deleted within 1 hour after processing, and we never access your documents manually.',
    },
    {
        question: 'Do I need to create an account?',
        answer: 'No. You can use all basic tools without creating an account. However, creating a free account gives you access to file history and higher usage limits.',
    },
    {
        question: 'What file formats are supported?',
        answer: 'We primarily work with PDF files. For conversion tools, we support Word (.docx), Excel (.xlsx), PowerPoint (.pptx), images (PNG, JPG), and HTML.',
    },
    {
        question: 'What is the maximum file size?',
        answer: 'Free users can upload files up to 10 MB. Pro users can upload files up to 100 MB. Enterprise users have no file size limits.',
    },
    {
        question: 'How long are files stored?',
        answer: 'Files are automatically deleted 1 hour after processing. Pro and Enterprise users can access file history for up to 30 days.',
    },
    {
        question: 'Can I use this for commercial purposes?',
        answer: 'Yes. All our plans, including the free tier, can be used for commercial purposes. For high-volume or API access, consider our Enterprise plan.',
    },
    {
        question: 'Do you offer refunds?',
        answer: 'Yes. We offer a 7-day money-back guarantee for all paid plans. Contact support if you\'re not satisfied.',
    },
    {
        question: 'Is there an API available?',
        answer: 'API access is available on our Enterprise plan. Contact our sales team for details and documentation.',
    },
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className={styles.page}>
            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backButton}>← Home</Link>
                    <span className={styles.pageTitle}>FAQ</span>
                </div>
            </nav>

            <main className={styles.main}>
                {/* Hero */}
                <div className={styles.hero}>
                    <h1 className={styles.title}>Frequently Asked Questions</h1>
                    <p className={styles.subtitle}>
                        Everything you need to know about PDF Tools.
                    </p>
                </div>

                {/* FAQ List */}
                <div className={styles.faqList}>
                    {faqs.map((faq, index) => (
                        <div key={index} className={styles.faqItem}>
                            <button
                                className={styles.faqQuestion}
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            >
                                {faq.question}
                                <span className={`${styles.faqChevron} ${openIndex === index ? styles.open : ''}`}>
                                    ▼
                                </span>
                            </button>
                            {openIndex === index && (
                                <div className={styles.faqAnswer}>
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
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
