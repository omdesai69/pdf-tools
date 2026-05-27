'use client';

import { useState } from 'react';
import styles from './FAQ.module.css';

interface FAQItem {
    question: string;
    answer: string;
}

const faqItems: FAQItem[] = [
    {
        question: "Is my file safe?",
        answer: "Yes. Your files are processed securely and automatically deleted after processing. We never access, read, or share your content."
    },
    {
        question: "Where are my files stored?",
        answer: "Files are temporarily stored only during processing, then immediately deleted. We don't keep any copies."
    },
    {
        question: "Do I need an account?",
        answer: "No. You can use all tools without signing up. Creating an account is optional and only unlocks higher limits."
    },
    {
        question: "What happens if I refresh the page?",
        answer: "Your files are cleared from memory. This is by design — it ensures nothing is left behind. Just upload again to continue."
    },
    {
        question: "Do you keep copies of my files?",
        answer: "Never. Files are deleted automatically after processing completes. We have no access to your content."
    },
    {
        question: "Can I trust this with sensitive documents?",
        answer: "Yes. We don't log, track, or store your files. Processing happens quickly, and everything is cleaned up after."
    }
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className={styles.faqSection}>
            <h2 className={styles.faqTitle}>Common Questions</h2>
            <div className={styles.faqList}>
                {faqItems.map((item, index) => (
                    <div key={index} className={styles.faqItem}>
                        <button
                            className={`${styles.faqQuestion} ${openIndex === index ? styles.open : ''}`}
                            onClick={() => toggle(index)}
                            aria-expanded={openIndex === index}
                        >
                            <span>{item.question}</span>
                            <svg
                                className={styles.faqChevron}
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <polyline points="6,9 12,15 18,9" />
                            </svg>
                        </button>
                        {openIndex === index && (
                            <div className={styles.faqAnswer}>
                                <p>{item.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

export default FAQ;
