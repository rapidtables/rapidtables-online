/**
 * RapidTables.online - CPX Core Runtime Engine (Modeled after SaveClip)
 * Automatically applies all Super Admin configurations dynamically across all site pages:
 * - Page SEO & Meta Overrides (Title, Description, Keywords, Canonical, Open Graph)
 * - Site-Wide or Per-Page Robots Index/Noindex Directives
 * - Multi-Language Floating Switcher & Google Translate Engine
 * - Live Top Announcement Alert Bar
 * - AdSense & Native Ad Placements
 * - Header, Footer & Menu Overrides
 * - Custom Head Scripts (GA4, GTM, Meta Pixel) & Body Scripts
 */
(function() {
  'use strict';

  try {
    const raw = localStorage.getItem('cpx_site_settings');
    const seoRaw = localStorage.getItem('rt_cpx_page_seo');
    const headerFooterRaw = localStorage.getItem('rt_cpx_header_footer');

    const cfg = raw ? JSON.parse(raw) : {};
    const pageSeo = seoRaw ? JSON.parse(seoRaw) : {};
    const hfCfg = headerFooterRaw ? JSON.parse(headerFooterRaw) : {};

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const filename = window.location.pathname.split('/').pop() || 'index.html';

    // 1. DYNAMIC PAGE SEO & META OVERRIDES
    const matchedSeo = pageSeo[currentPath] || pageSeo[filename] || pageSeo['/' + filename];
    if (matchedSeo) {
      if (matchedSeo.title) {
        document.title = matchedSeo.title;
      }
      if (matchedSeo.description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          document.head.appendChild(metaDesc);
        }
        metaDesc.content = matchedSeo.description;
      }
      if (matchedSeo.keywords) {
        let metaKw = document.querySelector('meta[name="keywords"]');
        if (!metaKw) {
          metaKw = document.createElement('meta');
          metaKw.name = 'keywords';
          document.head.appendChild(metaKw);
        }
        metaKw.content = matchedSeo.keywords;
      }
      if (matchedSeo.canonical) {
        let canon = document.querySelector('link[rel="canonical"]');
        if (!canon) {
          canon = document.createElement('link');
          canon.rel = 'canonical';
          document.head.appendChild(canon);
        }
        canon.href = matchedSeo.canonical;
      }
      if (matchedSeo.robots) {
        let robots = document.querySelector('meta[name="robots"]');
        if (!robots) {
          robots = document.createElement('meta');
          robots.name = 'robots';
          document.head.appendChild(robots);
        }
        robots.content = matchedSeo.robots;
      }
      // Open Graph
      if (matchedSeo.title) {
        setMetaProperty('og:title', matchedSeo.title);
      }
      if (matchedSeo.description) {
        setMetaProperty('og:description', matchedSeo.description);
      }
      if (matchedSeo.ogImage) {
        setMetaProperty('og:image', matchedSeo.ogImage);
      }
    }

    function setMetaProperty(prop, val) {
      let meta = document.querySelector(`meta[property="${prop}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', prop);
        document.head.appendChild(meta);
      }
      meta.content = val;
    }

    // 2. LIVE ANNOUNCEMENT ALERT BAR
    if (cfg.announcement && cfg.announcement.enabled && cfg.announcement.text) {
      const isDismissed = sessionStorage.getItem('cpx_announcement_dismissed');
      if (!isDismissed) {
        const themes = {
          blue: { bg: 'linear-gradient(90deg, #1E40AF, #2563EB)', text: '#FFFFFF' },
          green: { bg: 'linear-gradient(90deg, #065F46, #059669)', text: '#FFFFFF' },
          amber: { bg: 'linear-gradient(90deg, #92400E, #D97706)', text: '#FFFFFF' },
          red: { bg: 'linear-gradient(90deg, #991B1B, #DC2626)', text: '#FFFFFF' },
          purple: { bg: 'linear-gradient(90deg, #5B21B6, #7C3AED)', text: '#FFFFFF' },
          dark: { bg: 'linear-gradient(90deg, #0F172A, #1E293B)', text: '#38BDF8' }
        };
        const theme = themes[cfg.announcement.theme] || themes.blue;

        const bar = document.createElement('div');
        bar.id = 'cpx_announcement_bar';
        bar.style.cssText = `
          background: ${theme.bg};
          color: ${theme.text};
          text-align: center;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 600;
          position: relative;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        `;

        let inner = `<span>${cfg.announcement.text}</span>`;
        if (cfg.announcement.link && cfg.announcement.btnText) {
          inner += `<a href="${cfg.announcement.link}" style="background:rgba(255,255,255,0.22); color:#FFF; text-decoration:none; font-weight:700; padding:3px 10px; border-radius:4px; font-size:12px; margin-left:6px; display:inline-block;">${cfg.announcement.btnText} &rarr;</a>`;
        }
        inner += `<button type="button" id="cpx_dismiss_btn" style="background:none; border:none; color:rgba(255,255,255,0.8); cursor:pointer; font-size:18px; margin-left:12px; line-height:1;" title="Dismiss">&times;</button>`;
        bar.innerHTML = inner;

        const injectBar = () => {
          if (document.body && !document.getElementById('cpx_announcement_bar')) {
            document.body.insertBefore(bar, document.body.firstChild);
            const dismissBtn = document.getElementById('cpx_dismiss_btn');
            if (dismissBtn) {
              dismissBtn.addEventListener('click', () => {
                bar.remove();
                sessionStorage.setItem('cpx_announcement_dismissed', 'true');
              });
            }
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', injectBar);
        } else {
          injectBar();
        }
      }
    }

    // 3. MULTI-LANGUAGE HUB (12 LANGUAGES)
    const injectLangWidget = () => {
      if (document.getElementById('cpx_lang_widget')) return;

      const widget = document.createElement('div');
      widget.id = 'cpx_lang_widget';
      widget.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9990;
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        box-shadow: 0 4px 14px rgba(0,0,0,0.12);
        border-radius: 30px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-main, #0f172a);
      `;
      widget.innerHTML = `
        <span style="font-size:16px;">🌐</span>
        <select id="cpx_lang_select" style="background:transparent; border:none; outline:none; font-size:13px; font-weight:600; color:inherit; cursor:pointer;">
          <option value="en">English (US)</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="pt">Português</option>
          <option value="ar">العربية (Arabic)</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="ur">اردو (Urdu)</option>
          <option value="zh-CN">中文 (Chinese)</option>
          <option value="ja">日本語 (Japanese)</option>
          <option value="ru">Русский</option>
          <option value="it">Italiano</option>
        </select>
      `;

      document.body.appendChild(widget);

      // Google Translate
      if (!window._gt_injected) {
        window._gt_injected = true;
        window.googleTranslateElementInit = function() {
          new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,es,fr,de,pt,ar,hi,ur,zh-CN,ja,ru,it',
            autoDisplay: false
          }, 'google_translate_element');
        };
        const gtDiv = document.createElement('div');
        gtDiv.id = 'google_translate_element';
        gtDiv.style.display = 'none';
        document.body.appendChild(gtDiv);

        const gtScript = document.createElement('script');
        gtScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        gtScript.async = true;
        document.head.appendChild(gtScript);
      }

      const select = document.getElementById('cpx_lang_select');
      select.addEventListener('change', (e) => {
        const lang = e.target.value;
        document.cookie = `googtrans=/en/${lang}; path=/`;
        document.cookie = `googtrans=/en/${lang}; domain=.${window.location.hostname}; path=/`;
        window.location.reload();
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectLangWidget);
    } else {
      injectLangWidget();
    }

    // 4. GOOGLE ADSENSE & SCRIPT INJECTIONS
    if (cfg.ads && cfg.ads.enabled && cfg.ads.pubId && !window._adsense_injected) {
      window._adsense_injected = true;
      const adScript = document.createElement('script');
      adScript.async = true;
      adScript.crossOrigin = 'anonymous';
      adScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cfg.ads.pubId)}`;
      document.head.appendChild(adScript);
    }

    // Google Analytics GA4
    if (cfg.scripts && cfg.scripts.ga4Id && !window._ga4_injected) {
      window._ga4_injected = true;
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.scripts.ga4Id)}`;
      document.head.appendChild(s);

      const inline = document.createElement('script');
      inline.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${cfg.scripts.ga4Id}');
      `;
      document.head.appendChild(inline);
    }

    // Google Tag Manager (GTM)
    if (cfg.scripts && cfg.scripts.gtmId && !window._gtm_injected) {
      window._gtm_injected = true;
      const gtmScript = document.createElement('script');
      gtmScript.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${cfg.scripts.gtmId}');`;
      document.head.appendChild(gtmScript);
    }

    // Custom Head Script Tag
    if (cfg.scripts && cfg.scripts.headCode && !window._custom_head_injected) {
      window._custom_head_injected = true;
      const range = document.createRange();
      const fragment = range.createContextualFragment(cfg.scripts.headCode);
      document.head.appendChild(fragment);
    }

    // Custom Body Script Tag
    if (cfg.scripts && cfg.scripts.bodyCode && !window._custom_body_injected) {
      window._custom_body_injected = true;
      const injectBodyScripts = () => {
        const range = document.createRange();
        const fragment = range.createContextualFragment(cfg.scripts.bodyCode);
        document.body.appendChild(fragment);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBodyScripts);
      } else {
        injectBodyScripts();
      }
    }

    // 5. HEADER, FOOTER & MENUS OVERRIDES
    if (hfCfg && (hfCfg.logoText || hfCfg.copyrightText || hfCfg.supportEmail)) {
      const applyHeaderFooter = () => {
        if (hfCfg.logoText) {
          document.querySelectorAll('.logo-text').forEach(el => {
            el.innerHTML = hfCfg.logoText;
          });
        }
        if (hfCfg.copyrightText) {
          const footerBottom = document.querySelector('.footer-bottom div');
          if (footerBottom) {
            footerBottom.innerHTML = hfCfg.copyrightText;
          }
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyHeaderFooter);
      } else {
        applyHeaderFooter();
      }
    }

  } catch (err) {
    console.debug('CPX Runtime notice:', err);
  }
})();
