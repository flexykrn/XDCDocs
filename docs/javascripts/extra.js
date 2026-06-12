// UX Improvements for XDC Documentation
// Issues #177, #178, #179

(function() {
  'use strict';

  // ============================================================
  // #177: Last Updated Timestamp (JavaScript-based, no plugin needed)
  // ============================================================
  function addLastUpdatedTimestamp() {
    const article = document.querySelector('.md-content__inner');
    if (!article) return;

    // Get last modified date from git (if available) or use document date
    const metaDate = document.querySelector('meta[name="git-revision-date-localized"]');
    let dateText;
    
    if (metaDate) {
      dateText = metaDate.content;
    } else {
      // Fallback: use current date formatted
      const now = new Date();
      dateText = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    const footer = document.createElement('div');
    footer.className = 'last-updated-footer';
    footer.innerHTML = `Last updated: ${dateText}`;
    
    article.appendChild(footer);
  }

  // ============================================================
  // #178: Related Pages from Frontmatter
  // ============================================================
  function addRelatedPages() {
    const article = document.querySelector('.md-content__inner');
    if (!article) return;

    // Check if page has related_pages in frontmatter
    // This is handled by MkDocs meta extension - we read from the page meta
    const metaScript = document.querySelector('script[type="application/json"][data-page-meta]');
    let relatedPages = [];
    
    if (metaScript) {
      try {
        const meta = JSON.parse(metaScript.textContent);
        relatedPages = meta.related_pages || [];
      } catch (e) {
        console.log('Could not parse page meta');
      }
    }

    // Alternative: check for meta tags injected by MkDocs
    if (relatedPages.length === 0) {
      const relatedMeta = document.querySelector('meta[name="related_pages"]');
      if (relatedMeta) {
        try {
          relatedPages = JSON.parse(relatedMeta.content);
        } catch (e) {
          console.log('Could not parse related_pages meta');
        }
      }
    }

    if (relatedPages.length === 0) return;

    const section = document.createElement('div');
    section.className = 'related-pages';
    
    let cardsHtml = relatedPages.map(page => {
      // Extract title from path
      const pathParts = page.split('/');
      const filename = pathParts[pathParts.length - 1].replace('.md', '');
      const title = filename.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      return `
        <a href="${page.replace('.md', '/')}" class="related-pages__card">
          <div class="related-pages__card-title">${title}</div>
          <div class="related-pages__card-description">Explore ${title} documentation</div>
        </a>
      `;
    }).join('');

    section.innerHTML = `
      <div class="related-pages__title">Related Pages</div>
      <div class="related-pages__grid">
        ${cardsHtml}
      </div>
    `;

    article.appendChild(section);
  }

  // ============================================================
  // #179: Command Palette (Cmd+K / Shift+K)
  // ============================================================
  function initCommandPalette() {
    // Create palette elements
    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.innerHTML = `
      <div class="command-palette__container">
        <input type="text" class="command-palette__input" placeholder="Search documentation..." autocomplete="off">
        <div class="command-palette__results"></div>
        <div class="command-palette__shortcut-hint">
          <span>Use <kbd class="command-palette__kbd">↑</kbd> <kbd class="command-palette__kbd">↓</kbd> to navigate</span>
          <span><kbd class="command-palette__kbd">Enter</kbd> to select</span>
          <span><kbd class="command-palette__kbd">Esc</kbd> to close</span>
        </div>
      </div>
    `;
    document.body.appendChild(palette);

    const input = palette.querySelector('.command-palette__input');
    const results = palette.querySelector('.command-palette__results');

    // Build search index from navigation
    let searchIndex = [];
    
    function buildSearchIndex() {
      const nav = document.querySelector('.md-nav');
      if (!nav) return;

      searchIndex = [];
      const links = nav.querySelectorAll('a.md-nav__link');
      
      links.forEach(link => {
        const text = link.textContent.trim();
        const href = link.getAttribute('href');
        if (text && href && !href.startsWith('#')) {
          const breadcrumb = getBreadcrumb(link);
          searchIndex.push({
            title: text,
            href: href,
            breadcrumb: breadcrumb
          });
        }
      });
    }

    function getBreadcrumb(link) {
      const parts = [];
      let parent = link.closest('.md-nav__item');
      
      while (parent) {
        const parentLink = parent.querySelector(':scope > .md-nav__link');
        if (parentLink) {
          parts.unshift(parentLink.textContent.trim());
        }
        parent = parent.parentElement?.closest('.md-nav__item');
      }
      
      return parts.slice(0, -1).join(' > ');
    }

    // Open palette
    function openPalette() {
      buildSearchIndex();
      palette.classList.add('active');
      input.value = '';
      input.focus();
      renderResults(searchIndex.slice(0, 10));
    }

    // Close palette
    function closePalette() {
      palette.classList.remove('active');
    }

    // Render results
    function renderResults(items) {
      results.innerHTML = items.map((item, index) => `
        <a href="${item.href}" class="command-palette__result ${index === 0 ? 'selected' : ''}" data-index="${index}">
          <svg class="command-palette__result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <div class="command-palette__result-text">
            <div class="command-palette__result-title">${escapeHtml(item.title)}</div>
            ${item.breadcrumb ? `<div class="command-palette__result-breadcrumb">${escapeHtml(item.breadcrumb)}</div>` : ''}
          </div>
        </a>
      `).join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Search function
    function search(query) {
      if (!query) return searchIndex.slice(0, 10);
      
      const lowerQuery = query.toLowerCase();
      return searchIndex.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.breadcrumb.toLowerCase().includes(lowerQuery)
      ).slice(0, 10);
    }

    // Keyboard navigation
    let selectedIndex = 0;

    input.addEventListener('input', (e) => {
      const items = search(e.target.value);
      renderResults(items);
      selectedIndex = 0;
    });

    input.addEventListener('keydown', (e) => {
      const resultItems = results.querySelectorAll('.command-palette__result');
      
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, resultItems.length - 1);
          updateSelection(resultItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          updateSelection(resultItems);
          break;
        case 'Enter':
          e.preventDefault();
          const selected = resultItems[selectedIndex];
          if (selected) {
            window.location.href = selected.getAttribute('href');
          }
          break;
        case 'Escape':
          closePalette();
          break;
      }
    });

    function updateSelection(items) {
      items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedIndex);
      });
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }

    // Click on result
    results.addEventListener('click', (e) => {
      const result = e.target.closest('.command-palette__result');
      if (result) {
        window.location.href = result.getAttribute('href');
      }
    });

    // Close on backdrop click
    palette.addEventListener('click', (e) => {
      if (e.target === palette) {
        closePalette();
      }
    });

    // Keyboard shortcut - Shift+K (reliable across all browsers)
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.key === 'K' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openPalette();
      }
    });

    // Add shortcut hint to search box
    const searchForm = document.querySelector('.md-search__form');
    if (searchForm) {
      const hint = document.createElement('span');
      hint.className = 'md-search__shortcut';
      hint.innerHTML = '<kbd>Shift+K</kbd>';
      hint.style.cssText = 'position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);font-size:0.75rem;color:var(--md-default-fg-color--lighter);pointer-events:none;';
      searchForm.appendChild(hint);
    }
  }

  // ============================================================
  // Initialize all features when page loads
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      addLastUpdatedTimestamp();
      addRelatedPages();
      initCommandPalette();
    });
  } else {
    addLastUpdatedTimestamp();
    addRelatedPages();
    initCommandPalette();
  }

  console.log('XDC Docs UX improvements loaded: #177 Last Updated, #178 Related Pages, #179 Command Palette');
})();
