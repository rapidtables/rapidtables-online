/**
 * RapidTables.online - CPX Core Runtime Engine
 * Automatically applies Super Admin configurations dynamically across all site pages:
 * - Real-time Announcement Alert Bar (with themes, action link, dismissible)
 * - Google AdSense Auto-Injection
 * - Custom Head Scripts (GA4, GTM, Meta Pixel) & Body Scripts
 * - Dynamic Page SEO Overrides
 * - Site Logo & Footer Copyright Overrides
 * - Multi-Language Engine & Google Translate Integration
 */
(function() {
  'use strict';

  // Apply Page-Specific SEO Overrides from Storage (if any)
  function applyPageSeo(seoData) {
    if (!seoData) return;
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const matched = seoData[currentPath] || seoData[filename] || seoData['/' + filename] || seoData[window.location.pathname];
    if (matched) {
      if (matched.title) document.title = matched.title;
      if (matched.description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          document.head.appendChild(metaDesc);
        }
        metaDesc.content = matched.description;
      }
      if (matched.keywords) {
        let metaKw = document.querySelector('meta[name="keywords"]');
        if (!metaKw) {
          metaKw = document.createElement('meta');
          metaKw.name = 'keywords';
          document.head.appendChild(metaKw);
        }
        metaKw.content = matched.keywords;
      }
      if (matched.canonical) {
        let canon = document.querySelector('link[rel="canonical"]');
        if (!canon) {
          canon = document.createElement('link');
          canon.rel = 'canonical';
          document.head.appendChild(canon);
        }
        canon.href = matched.canonical;
      }
      if (matched.robots) {
        let robots = document.querySelector('meta[name="robots"]');
        if (!robots) {
          robots = document.createElement('meta');
          robots.name = 'robots';
          document.head.appendChild(robots);
        }
        robots.content = matched.robots;
      }
    }
  }

  // Render Announcement Banner
  function applyAnnouncement(cfg) {
    if (!cfg || !cfg.enabled || !cfg.text) return;
    if (document.getElementById('cpx_announcement_bar')) return;
    if (sessionStorage.getItem('cpx_announcement_dismissed') === 'true') return;

    const themes = {
      blue: { bg: 'linear-gradient(90deg, #1E40AF, #2563EB)', text: '#FFFFFF' },
      green: { bg: 'linear-gradient(90deg, #065F46, #059669)', text: '#FFFFFF' },
      amber: { bg: 'linear-gradient(90deg, #92400E, #D97706)', text: '#FFFFFF' },
      red: { bg: 'linear-gradient(90deg, #991B1B, #DC2626)', text: '#FFFFFF' },
      purple: { bg: 'linear-gradient(90deg, #5B21B6, #7C3AED)', text: '#FFFFFF' },
      dark: { bg: 'linear-gradient(90deg, #0F172A, #1E293B)', text: '#38BDF8' }
    };
    const t = themes[cfg.theme] || themes.blue;

    const bar = document.createElement('div');
    bar.id = 'cpx_announcement_bar';
    bar.style.cssText = `
      background: ${t.bg};
      color: ${t.text};
      text-align: center;
      padding: 10px 18px;
      font-size: 13.5px;
      font-weight: 600;
      position: relative;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    `;

    let html = `<span>${cfg.text}</span>`;
    if (cfg.link && (cfg.btnText || cfg.linkText)) {
      const btn = cfg.btnText || cfg.linkText || 'Learn More';
      html += `<a href="${cfg.link}" style="background:rgba(255,255,255,0.22); color:#fff; padding:3px 10px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${btn} &rarr;</a>`;
    }
    html += `<button type="button" id="cpx_close_announcement" aria-label="Close" style="background:none; border:none; color:inherit; font-size:18px; cursor:pointer; padding:0 6px; line-height:1; opacity:0.85; margin-left:8px;">&times;</button>`;
    bar.innerHTML = html;

    const onReady = () => {
      document.body.insertAdjacentElement('afterbegin', bar);
      document.getElementById('cpx_close_announcement')?.addEventListener('click', () => {
        bar.style.display = 'none';
        sessionStorage.setItem('cpx_announcement_dismissed', 'true');
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }

  // Inject AdSense & Custom Scripts
  function applyScriptsAndAds(settings) {
    if (!settings) return;

    // AdSense
    if (settings.ads && settings.ads.enabled && settings.ads.pubId && !window._adsense_injected) {
      window._adsense_injected = true;
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(settings.ads.pubId)}`;
      document.head.appendChild(s);
    }

    // Google Analytics GA4
    if (settings.scripts && settings.scripts.ga4Id && !window._ga4_injected) {
      window._ga4_injected = true;
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.scripts.ga4Id)}`;
      document.head.appendChild(s);

      const inline = document.createElement('script');
      inline.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${settings.scripts.ga4Id}');
      `;
      document.head.appendChild(inline);
    }

    // Google Tag Manager (GTM)
    if (settings.scripts && settings.scripts.gtmId && !window._gtm_injected) {
      window._gtm_injected = true;
      const gtmScript = document.createElement('script');
      gtmScript.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${settings.scripts.gtmId}');`;
      document.head.appendChild(gtmScript);
    }

    // Custom Head Script Tag
    if (settings.scripts && settings.scripts.headCode && !window._custom_head_injected) {
      window._custom_head_injected = true;
      try {
        const range = document.createRange();
        const fragment = range.createContextualFragment(settings.scripts.headCode);
        document.head.appendChild(fragment);
      } catch (e) {}
    }

    // Custom Body Script Tag
    if (settings.scripts && settings.scripts.bodyCode && !window._custom_body_injected) {
      window._custom_body_injected = true;
      const injectBody = () => {
        try {
          const range = document.createRange();
          const fragment = range.createContextualFragment(settings.scripts.bodyCode);
          document.body.appendChild(fragment);
        } catch (e) {}
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBody);
      } else {
        injectBody();
      }
    }

    // Header & Footer Overrides
    if (settings.headerFooter) {
      const applyHF = () => {
        if (settings.headerFooter.logoText) {
          document.querySelectorAll('.logo-text').forEach(el => {
            el.innerHTML = settings.headerFooter.logoText;
          });
        }
        if (settings.headerFooter.copyrightText) {
          const footerBottom = document.querySelector('.footer-bottom div') || document.querySelector('.footer-bottom');
          if (footerBottom) {
            footerBottom.innerHTML = settings.headerFooter.copyrightText;
          }
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyHF);
      } else {
        applyHF();
      }
    }
  }

  // Main Runtime Init
  try {
    // 1. Check local storage first (instant synchronous execution)
    const localSettings = JSON.parse(localStorage.getItem('cpx_site_settings') || '{}');
    const localSeo = JSON.parse(localStorage.getItem('rt_cpx_page_seo') || '{}');
    applyPageSeo(localSeo);
    if (localSettings.announcement) applyAnnouncement(localSettings.announcement);
    applyScriptsAndAds(localSettings);

    // 2. Fetch live settings from server API (asynchronous update)
    fetch('/api/site-settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && (data.success || data.announcement || data.scripts || data.ads)) {
          applyAnnouncement(data.announcement);
          applyScriptsAndAds(data);
        }
      })
      .catch(() => {});
  } catch (err) {
    // Fail-safe silent error handler
  }
})();
