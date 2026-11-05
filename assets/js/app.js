// Theme Switcher
(function() {
  const savedTheme = localStorage.getItem('rt_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', current);
  localStorage.setItem('rt_theme', current);
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.innerHTML = current === 'dark' ? '&#9728;&#65039;' : '&#127769;';
  }
}

// Toast helper
function showToast(message) {
  let toast = document.getElementById('site-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Copy to clipboard helper
function copyText(elementIdOrText, isDirectText = false) {
  let text = isDirectText ? elementIdOrText : (document.getElementById(elementIdOrText)?.innerText || document.getElementById(elementIdOrText)?.value || '');
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy');
  });
}

// Global Instant Search & Shortcuts
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('site-search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const themeBtn = document.getElementById('theme-toggle-btn');
  const kbdBadge = document.querySelector('.search-kbd');

  // Update Mac vs Windows/Linux shortcut pill
  if (kbdBadge) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    kbdBadge.textContent = isMac ? '⌘K' : 'Ctrl K';
  }

  if (themeBtn) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.innerHTML = isDark ? '&#9728;&#65039;' : '&#127769;';
  }

  // Highlight active nav link and scroll active item into view on mobile
  const navLinks = document.querySelectorAll('.header-nav-link');
  const currentPath = window.location.pathname.toLowerCase();
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const cleanHref = href.replace(/^(\.\.\/|\.\/)/, '').toLowerCase();
      if (cleanHref && cleanHref !== './' && currentPath.includes(cleanHref)) {
        link.classList.add('active');
        try {
          link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}
      }
    }
  });

  // Initialize Mobile Hamburger Menu & Slide-out Drawer
  initMobileMenu();

  // Initialize Mobile Search Icon & Toggle
  initMobileSearch();

  // Keyboard shortcut: Ctrl+K / Cmd+K or / to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === 'Escape' && searchDropdown && searchDropdown.classList.contains('active')) {
      searchDropdown.classList.remove('active');
      if (searchInput) searchInput.blur();
    }
  });

  if (searchInput && searchDropdown && typeof SITE_TOOLS_INDEX !== 'undefined') {
    let selectedIdx = -1;

    function renderResults(matches, q) {
      if (matches.length === 0) {
        searchDropdown.innerHTML = `<div class="search-result-item" style="color:var(--text-muted); cursor:default;">No results found for "${q}"</div>`;
        searchDropdown.classList.add('active');
        selectedIdx = -1;
        return;
      }

      // Compute relative prefix for subfolder navigation
      let prefix = '';
      if (window.location.protocol === 'file:') {
        const currentPath = window.location.pathname.replace(/\\/g, '/');
        const projectRootIdx = currentPath.indexOf('rapidtables-online');
        if (projectRootIdx !== -1) {
          const subPath = currentPath.substring(projectRootIdx + 'rapidtables-online'.length);
          const slashCount = (subPath.match(/\//g) || []).length;
          prefix = '../'.repeat(Math.max(0, slashCount - 1));
        }
      } else {
        const pathname = window.location.pathname;
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length > 1) {
          prefix = '../'.repeat(parts.length - 1);
        }
      }

      searchDropdown.innerHTML = matches.map((item, idx) => {
        let finalUrl = item.url;
        if (prefix && finalUrl.startsWith('/')) {
          finalUrl = prefix + finalUrl.substring(1);
        }
        return `
          <a href="${finalUrl}" class="search-result-item" data-idx="${idx}">
            <span><strong>${item.title}</strong></span>
            <span class="search-category-badge">${item.category}</span>
          </a>
        `;
      }).join('');
      searchDropdown.classList.add('active');
      selectedIdx = -1;
    }

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        searchDropdown.classList.remove('active');
        searchDropdown.innerHTML = '';
        selectedIdx = -1;
        return;
      }

      const matches = SITE_TOOLS_INDEX.filter(item => {
        return item.title.toLowerCase().includes(q) || 
               item.keywords.toLowerCase().includes(q) ||
               item.category.toLowerCase().includes(q);
      }).slice(0, 8);

      renderResults(matches, e.target.value);
    });

    // Arrow keys & Enter navigation
    searchInput.addEventListener('keydown', (e) => {
      const items = searchDropdown.querySelectorAll('.search-result-item[href]');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = (selectedIdx + 1) % items.length;
        updateSelection(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = (selectedIdx - 1 + items.length) % items.length;
        updateSelection(items);
      } else if (e.key === 'Enter') {
        if (selectedIdx >= 0 && items[selectedIdx]) {
          e.preventDefault();
          items[selectedIdx].click();
        }
      }
    });

    function updateSelection(items) {
      items.forEach((item, idx) => {
        if (idx === selectedIdx) {
          item.classList.add('selected');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('selected');
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove('active');
      }
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) {
        searchDropdown.classList.add('active');
      }
    });
  }
});

// Mobile Hamburger Menu & Slide-out Drawer Implementation
function initMobileMenu() {
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) return;

  // 1. Ensure hamburger button exists in header-actions
  let menuBtn = document.getElementById('mobile-menu-btn');
  if (!menuBtn) {
    menuBtn = document.createElement('button');
    menuBtn.id = 'mobile-menu-btn';
    menuBtn.className = 'btn-icon mobile-menu-btn';
    menuBtn.setAttribute('aria-label', 'Open Navigation Menu');
    menuBtn.title = 'Open Menu';
    menuBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    headerActions.appendChild(menuBtn);
  }

  // 2. Ensure mobile drawer and overlay exist in document.body
  let overlay = document.getElementById('mobile-drawer-overlay');
  let drawer = document.getElementById('mobile-drawer');

  // Compute prefix for current page location
  let prefix = '';
  if (window.location.protocol === 'file:') {
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    const projectRootIdx = currentPath.indexOf('rapidtables-online');
    if (projectRootIdx !== -1) {
      const subPath = currentPath.substring(projectRootIdx + 'rapidtables-online'.length);
      const slashCount = (subPath.match(/\//g) || []).length;
      prefix = '../'.repeat(Math.max(0, slashCount - 1));
    }
  } else {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      prefix = '../'.repeat(parts.length - 1);
    }
  }

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobile-drawer-overlay';
    overlay.className = 'mobile-drawer-overlay';
    document.body.appendChild(overlay);
  }

  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'mobile-drawer';
    drawer.className = 'mobile-drawer';
    drawer.innerHTML = `
      <div class="mobile-drawer-header">
        <div class="mobile-drawer-title">
          <div class="logo-icon" style="width:26px; height:26px; font-size:14px; border-radius:6px;">⚡</div>
          <span>Rapid<strong>Tables</strong> Menu</span>
        </div>
        <button id="mobile-drawer-close-btn" class="mobile-drawer-close" aria-label="Close Menu">✕</button>
      </div>

      <div class="mobile-drawer-body">
        <div class="drawer-section-title">Main Suites</div>
        <ul class="drawer-nav-list">
          <li class="drawer-nav-item">
            <a href="${prefix}pdf/"><span class="drawer-icon">📑</span> <span>PDF Tools Suite</span> <span class="drawer-badge">Free</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}calc/"><span class="drawer-icon">🧮</span> <span>Calculators</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}convert/"><span class="drawer-icon">🔄</span> <span>Converters</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}tools/"><span class="drawer-icon">🛠️</span> <span>Web &amp; Dev Tools</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}tools/notepad.html"><span class="drawer-icon">📝</span> <span>Online Notepad</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}tools/qr-code-generator.html"><span class="drawer-icon">📱</span> <span>Custom QR Studio</span></a>
          </li>
        </ul>

        <div class="drawer-section-title">Popular Tools</div>
        <ul class="drawer-nav-list">
          <li class="drawer-nav-item">
            <a href="${prefix}pdf/merge-pdf.html"><span class="drawer-icon">📑</span> <span>Merge PDF Files</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}pdf/sign-pdf.html"><span class="drawer-icon">✍️</span> <span>Sign PDF Document</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}calc/math/scientific-calculator.html"><span class="drawer-icon">🔬</span> <span>Scientific Calculator</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}calc/finance/mortgage-calculator.html"><span class="drawer-icon">🏠</span> <span>Mortgage Calculator</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}calc/finance/tip-calculator.html"><span class="drawer-icon">💵</span> <span>Tip &amp; Bill Splitter</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}tools/barcode-generator.html"><span class="drawer-icon">📊</span> <span>Barcode Generator</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}tools/regex-tester.html"><span class="drawer-icon">🔍</span> <span>Regex Live Tester</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}tools/meta-tag-generator.html"><span class="drawer-icon">🌐</span> <span>SEO Meta Generator</span></a>
          </li>
        </ul>

        <div class="drawer-section-title">Company &amp; Legal</div>
        <ul class="drawer-nav-list">
          <li class="drawer-nav-item">
            <a href="${prefix}about.html"><span class="drawer-icon">ℹ️</span> <span>About Us</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}privacy.html"><span class="drawer-icon">🔒</span> <span>Privacy Policy</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}terms.html"><span class="drawer-icon">📜</span> <span>Terms of Service</span></a>
          </li>
          <li class="drawer-nav-item">
            <a href="${prefix}contact.html"><span class="drawer-icon">✉️</span> <span>Contact &amp; Support</span></a>
          </li>
        </ul>
      </div>

      <div class="mobile-drawer-footer">
        <span>🔒 100% Client-Side Private</span>
        <span>v2.0 &bull; 2026</span>
      </div>
    `;
    document.body.appendChild(drawer);
  }

  function openDrawer() {
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDrawer();
  });

  const closeBtn = document.getElementById('mobile-drawer-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrawer);
  }

  overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) {
      closeDrawer();
    }
  });

  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });
}

// Mobile Search Icon Toggle & Auto-Mount
function initMobileSearch() {
  const headerActions = document.querySelector('.header-actions');
  const headerSearch = document.querySelector('.header-search');
  const searchWrapper = document.querySelector('.search-input-wrapper');
  const searchInput = document.getElementById('site-search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  if (!headerActions || !headerSearch) return;

  // 1. Ensure mobile search button exists in header-actions
  let searchBtn = document.getElementById('mobile-search-btn');
  if (!searchBtn) {
    searchBtn = document.createElement('button');
    searchBtn.id = 'mobile-search-btn';
    searchBtn.className = 'btn-icon mobile-search-btn';
    searchBtn.setAttribute('aria-label', 'Open Search');
    searchBtn.title = 'Search Tools';
    searchBtn.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    `;
    // Insert as the first element in header-actions
    headerActions.insertBefore(searchBtn, headerActions.firstChild);
  }

  // 2. Ensure close button exists inside search-input-wrapper
  let closeBtn = document.getElementById('search-close-btn');
  if (!closeBtn && searchWrapper) {
    closeBtn = document.createElement('button');
    closeBtn.id = 'search-close-btn';
    closeBtn.type = 'button';
    closeBtn.className = 'search-close-btn';
    closeBtn.setAttribute('aria-label', 'Close search');
    closeBtn.title = 'Close search';
    closeBtn.innerHTML = '✕';
    searchWrapper.appendChild(closeBtn);
  }

  function openSearch() {
    headerSearch.classList.add('active');
    searchBtn.classList.add('active');
    if (searchInput) {
      setTimeout(() => {
        searchInput.focus();
        searchInput.select();
      }, 50);
    }
  }

  function closeSearch() {
    headerSearch.classList.remove('active');
    searchBtn.classList.remove('active');
    if (searchDropdown) {
      searchDropdown.classList.remove('active');
    }
    if (searchInput) {
      searchInput.blur();
    }
  }

  // Click search icon button to toggle
  searchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (headerSearch.classList.contains('active')) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  // Click close button inside search input
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSearch();
    });
  }

  // Click outside to close mobile search (only on mobile screens <= 768px)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!headerSearch.contains(e.target) && !searchBtn.contains(e.target)) {
        closeSearch();
      }
    }
  });

  // Escape key closes search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && headerSearch.classList.contains('active')) {
      closeSearch();
    }
  });
}

// CPX Super Admin Core Loader
(function() {
  if (typeof window !== 'undefined' && !window._cpx_embed_loaded) {
    window._cpx_embed_loaded = true;
    const s = document.createElement('script');
    s.src = '/assets/js/cpx-embed.js';
    s.defer = true;
    document.head.appendChild(s);
  }
})();
