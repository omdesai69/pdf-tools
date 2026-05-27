'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { activeCategories, quickStartTools, searchTools, getToolById, isToolActive, type Tool, type ToolCategory } from '@/lib/tools';
import { useAuth } from '@/lib/auth';
import { getRecentFiles, getRecentTools, type RecentFile, type RecentTool } from '@/lib/storage';
import { ThemeToggleIcon } from '@/components/ThemeToggle';
import FAQ from '@/components/FAQ';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();
  const { user, usage } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [recentTools, setRecentToolsState] = useState<RecentTool[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([activeCategories[0]?.id].filter(Boolean)) // Only first category expanded
  );

  // Load recents on mount
  useEffect(() => {
    setRecentFiles(getRecentFiles().slice(0, 5));
    setRecentToolsState(getRecentTools().slice(0, 5));
  }, []);

  // Filter tools based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return activeCategories;

    const matchingTools = searchTools(searchQuery);
    const matchingIds = new Set(matchingTools.map(t => t.id));

    return activeCategories
      .map((cat: ToolCategory) => ({
        ...cat,
        tools: cat.tools.filter((t: Tool) => matchingIds.has(t.id))
      }))
      .filter((cat: ToolCategory) => cat.tools.length > 0);
  }, [searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleToolClick = (tool: Tool) => {
    router.push(`/tools/${tool.id}`);
  };

  return (
    <div className={styles.app}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navContent}>
          <span className={styles.logo}>📄 PDF Tools</span>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.navActions}>
            <ThemeToggleIcon />
            <Link href="/history" className={styles.navBtn}>
              History
            </Link>
          </div>
        </div>
      </nav>

      {/* Usage Banner (for near-limit users) */}
      {usage.filesProcessedToday >= 3 && (
        <div className={styles.usageBanner}>
          ⚠️ You&apos;ve used {usage.filesProcessedToday}/5 free files today. Limits reset daily.
        </div>
      )}

      {/* Main Content */}
      <main className={styles.main}>
        {/* Premium Hero Section */}
        {!searchQuery && (
          <section className={styles.hero}>
            <div className={styles.heroGlow}></div>
            <h1 className={styles.heroTitle}>
              Process documents <br />
              <span className={styles.heroHighlight}>with precision.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              The fastest, most secure way to merge, split, and optimize your PDFs.<br />
              All processed locally in your browser.
            </p>
          </section>
        )}

        {/* Quick Start (only show when not searching) */}
        {!searchQuery && (
          <section className={styles.quickStart}>
            <h2 className={styles.sectionTitle}>Quick Start</h2>
            <div className={styles.quickGrid}>
              {quickStartTools.map(tool => (
                <button
                  key={tool.id}
                  className={styles.quickCard}
                  onClick={() => handleToolClick(tool)}
                >
                  <span className={styles.quickIcon}>{tool.icon}</span>
                  <span className={styles.quickName}>{tool.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent Tools (only show when has history and not searching) */}
        {!searchQuery && recentTools.length > 0 && (
          <section className={styles.recentSection}>
            <h2 className={styles.sectionTitle}>🕐 Recent Tools</h2>
            <div className={styles.recentGrid}>
              {recentTools.map(recent => {
                const tool = getToolById(recent.id);
                if (!tool || !isToolActive(tool.id)) return null;
                return (
                  <button
                    key={recent.id}
                    className={styles.recentCard}
                    onClick={() => handleToolClick(tool)}
                  >
                    <span className={styles.recentIcon}>{tool.icon}</span>
                    <span className={styles.recentName}>{tool.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Files (only show when has history and not searching) */}
        {!searchQuery && recentFiles.length > 0 && (
          <section className={styles.recentSection}>
            <h2 className={styles.sectionTitle}>📁 Recent Files</h2>
            <div className={styles.recentFilesList}>
              {recentFiles.map((file, index) => {
                const tool = getToolById(file.toolId);
                return (
                  <div key={`${file.name}-${index}`} className={styles.recentFileItem}>
                    <span className={styles.fileName}>📄 {file.name}</span>
                    <span className={styles.fileToolBadge}>
                      {tool ? tool.name : file.toolName}
                    </span>
                    <span className={styles.fileTime}>
                      {new Date(file.processedAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* All Tools */}
        <section className={styles.allTools}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {searchQuery ? `Results for "${searchQuery}"` : 'All Tools'}
            </h2>
            <span className={styles.toolCount}>
              {filteredCategories.reduce((sum: number, cat: ToolCategory) => sum + cat.tools.length, 0)} tools
            </span>
          </div>

          {filteredCategories.map((category: ToolCategory) => (
            <div key={category.id} className={styles.category}>
              <button
                className={styles.categoryHeader}
                onClick={() => toggleCategory(category.id)}
              >
                <span className={styles.categoryIcon}>{category.icon}</span>
                <span className={styles.categoryName}>{category.name}</span>
                <span className={styles.categoryCount}>({category.tools.length})</span>
                <span className={`${styles.chevron} ${expandedCategories.has(category.id) ? styles.expanded : ''}`}>
                  ▾
                </span>
              </button>

              {expandedCategories.has(category.id) && (
                <div className={styles.toolGrid}>
                  {category.tools.map((tool: Tool) => (
                    <button
                      key={tool.id}
                      className={styles.toolCard}
                      onClick={() => handleToolClick(tool)}
                    >
                      <span className={styles.toolIcon}>{tool.icon}</span>
                      <span className={styles.toolName}>{tool.name}</span>
                      <span className={styles.toolDesc}>{tool.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className={styles.noResults}>
              <p>No tools found for &quot;{searchQuery}&quot;</p>
              <button
                className={styles.clearSearch}
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            </div>
          )}
        </section>
      </main>

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <footer className={styles.footer}>
        {/* Trust Strip */}
        <div className={styles.trustStrip}>
          <span>🔒 Files auto-deleted</span>
          <span className={styles.trustDivider}>•</span>
          <span>🚫 No tracking</span>
          <span className={styles.trustDivider}>•</span>
          <span>✓ No account required</span>
          <span className={styles.trustDivider}>•</span>
          <span>🛡️ Privacy-first</span>
        </div>

        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <h3>📄 PDF Tools</h3>
            <p>Premium document processing for everyone. Your files stay private — we never store or share your data.</p>
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
          <p>© 2024 PDF Tools. All rights reserved.</p>
          <p style={{ fontSize: '0.875rem', marginTop: '8px', opacity: 0.8 }}>
            Created by <strong>Om Desai</strong> • <a href="mailto:omdesai608@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>omdesai608@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
