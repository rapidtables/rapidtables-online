/**
 * RapidTables.online - CPX Frontend Embed
 * Reads CPX Admin settings and applies live announcements, tracking, and custom rules
 */
(function() {
  try {
    const raw = localStorage.getItem('cpx_site_settings');
    if (!raw) return;
    const cfg = JSON.parse(raw);

    // 1. Live Announcement Banner
    if (cfg.announcement && cfg.announcement.enabled && cfg.announcement.text) {
      const themes = {
        blue: { bg: 'linear-gradient(90deg, #1E40AF, #2563EB)', text: '#FFFFFF', border: '#3B82F6' },
        green: { bg: 'linear-gradient(90deg, #065F46, #059669)', text: '#FFFFFF', border: '#10B981' },
        amber: { bg: 'linear-gradient(90deg, #92400E, #D97706)', text: '#FFFFFF', border: '#F59E0B' },
        purple: { bg: 'linear-gradient(90deg, #5B21B6, #7C3AED)', text: '#FFFFFF', border: '#8B5CF6' }
      };
      const theme = themes[cfg.announcement.theme] || themes.blue;

      const bar = document.createElement('div');
      bar.id = 'cpx_announcement_bar';
      bar.style.cssText = `
        background: ${theme.bg};
        color: ${theme.text};
        text-align: center;
        padding: 9px 16px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.2px;
        position: relative;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      `;

      let inner = `<span>${cfg.announcement.text}</span>`;
      if (cfg.announcement.link) {
        inner += `<a href="${cfg.announcement.link}" style="color:#FFF; text-decoration:underline; font-weight:700; margin-left:6px;">Learn More &rarr;</a>`;
      }
      inner += `<button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:rgba(255,255,255,0.7); cursor:pointer; font-size:16px; margin-left:12px; line-height:1;" title="Dismiss">&times;</button>`;
      bar.innerHTML = inner;

      // Prepend to body
      if (document.body) {
        document.body.insertBefore(bar, document.body.firstChild);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.insertBefore(bar, document.body.firstChild);
        });
      }
    }

    // 2. Google Analytics 4 Injection
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
  } catch (e) {
    console.debug('CPX embed init:', e);
  }
})();
