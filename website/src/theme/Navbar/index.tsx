import React, { useEffect, useState } from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useColorMode } from '@docusaurus/theme-common';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function Navbar() {
  const { navbar, secondaryNavbar } = useThemeConfig();
  const { colorMode, setColorMode } = useColorMode();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Top Navbar */}
      <nav className={styles.topNavbar}>
        <div className={styles.topNavbarInner}>
          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <img
              src={useBaseUrl(colorMode === 'dark' ? navbar.logo?.srcDark : navbar.logo?.src)}
              alt={navbar.logo?.alt || 'XDC Network'}
              className={styles.logoImg}
            />
          </Link>

          {/* Right side: AI Chatbot, Search, Theme Toggle */}
          <div className={styles.topRight}>
            {/* AI Chatbot Button — Floating orb style */}
            {/* AI Chatbot Button (placeholder) */}
            <button className={styles.aiButton} aria-label="AI Chatbot">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8"/>
                <rect width="16" height="12" x="4" y="8" rx="2"/>
                <path d="M2 14h2"/>
                <path d="M20 14h2"/>
                <path d="M15 13v2"/>
                <path d="M9 13v2"/>
              </svg>
            </button>

            {/* Search */}
            <div className={styles.searchBox} onClick={() => setSearchOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <span>Search</span>
            </div>

            {/* Theme Toggle — Direct icon only */}
            <button
              className={styles.themeToggle}
              onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle dark mode"
            >
              {colorMode === 'dark' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.2"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.1"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary Navbar */}
      <nav className={styles.secondaryNavbar}>
        <div className={styles.secondaryNavbarInner}>
          {secondaryNavbar?.items?.map((item: any, index: number) => (
            <Link
              key={index}
              to={item.to}
              className={styles.navLink}
              activeClassName={styles.navLinkActive}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Search Modal */}
      {searchOpen && (
        <div className={styles.searchModal} onClick={() => setSearchOpen(false)}>
          <div className={styles.searchModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.searchInputWrapper}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search documentation..."
                className={styles.searchInput}
                autoFocus
              />
              <kbd className={styles.searchEsc}>Esc</kbd>
            </div>
            <div className={styles.searchResults}>
              <p className={styles.searchPlaceholder}>Type to search...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
