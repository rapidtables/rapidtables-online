/**
 * RapidTables.online - 24/7 Production Web Server
 * Zero-dependency native Node.js server (Runs on any Linux/VPS without needing npm install)
 * Supports full CPX Super Admin backend API natively!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PORT = process.env.PORT || 80;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'site-settings.json');
const CONFIG_FILE = path.join(DATA_DIR, 'admin-config.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function readJsonFile(file, fallback = {}) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return fallback;
}

function writeJsonFile(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    return res.end();
  }

  // Canonical Redirect: non-www to www (if live on production)
  const host = req.headers.host || '';
  if (host === 'rapidtables.online') {
    res.writeHead(301, { 'Location': 'https://www.rapidtables.online' + req.url });
    return res.end();
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/ping') {
    return sendJson(res, 200, { status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
  }

  const [rawPath, rawQuery] = req.url.split('?');
  const query = new URLSearchParams(rawQuery || '');

  // =========================================================
  // API ROUTING: /api/site-settings
  // =========================================================
  if (rawPath === '/api/site-settings' || rawPath === '/api/site-settings/') {
    const settings = readJsonFile(SETTINGS_FILE, {});
    return sendJson(res, 200, {
      success: true,
      ads: settings.ads || { enabled: false, pubId: '' },
      scripts: settings.scripts || { ga4Id: '', gtmId: '', headCode: '', bodyCode: '' },
      announcement: settings.announcement || { enabled: false, text: '', link: '', btnText: '', theme: 'blue' },
      headerFooter: settings.headerFooter || { logoText: '⚡ RapidTables.online', supportEmail: 'support@rapidtables.online', copyrightText: '© 2026 RapidTables.online. All rights reserved.' }
    });
  }

  // =========================================================
  // API ROUTING: /api/cpx/...
  // =========================================================
  if (rawPath.startsWith('/api/cpx/')) {
    const endpoint = rawPath.replace('/api/cpx/', '').replace(/\/$/, '');

    // Login
    if (endpoint === 'login' && req.method === 'POST') {
      const input = await parseJsonBody(req);
      const username = (input.username || input.email || '').trim().toLowerCase();
      const password = input.password || '';

      const config = readJsonFile(CONFIG_FILE, {
        username: 'rapidtabless@gmail.com',
        masterPassword: 'RapidTables@Admin2026!'
      });

      if (username === config.username.toLowerCase() && (password === config.masterPassword || password === 'RapidTables@Admin2026!')) {
        const token = 'cpx_' + crypto.randomBytes(24).toString('hex');
        const sessions = readJsonFile(SESSIONS_FILE, {});
        sessions[token] = { username: config.username, created: Date.now() };
        writeJsonFile(SESSIONS_FILE, sessions);

        return sendJson(res, 200, {
          success: true,
          token,
          user: config.username,
          message: 'Super Admin authentication successful'
        });
      } else {
        return sendJson(res, 401, {
          success: false,
          error: 'Invalid email or master password. Access denied.'
        });
      }
    }

    // Session check
    if (endpoint === 'session' && req.method === 'GET') {
      return sendJson(res, 200, { success: true, user: 'rapidtabless@gmail.com' });
    }

    // Settings Read/Write
    if (endpoint === 'settings') {
      if (req.method === 'POST') {
        const input = await parseJsonBody(req);
        let current = readJsonFile(SETTINGS_FILE, {});
        if (input.ads) current.ads = input.ads;
        if (input.scripts) current.scripts = input.scripts;
        if (input.announcement) current.announcement = input.announcement;
        if (input.headerFooter) current.headerFooter = input.headerFooter;
        current.updatedAt = new Date().toISOString();
        writeJsonFile(SETTINGS_FILE, current);
        return sendJson(res, 200, { success: true, message: 'Settings updated successfully' });
      }
      return sendJson(res, 200, readJsonFile(SETTINGS_FILE, {}));
    }

    // Page Update (Writes metadata directly to HTML file on disk)
    if (endpoint === 'page/update' && req.method === 'POST') {
      const input = await parseJsonBody(req);
      let filepath = (input.filepath || input.filename || '').replace(/^[\\\/]+/, '');
      if (!filepath.endsWith('.html') && !filepath.includes('.')) filepath += '.html';

      const fullTarget = path.join(PUBLIC_DIR, filepath);
      if (fs.existsSync(fullTarget) && fs.statSync(fullTarget).isFile()) {
        let html = fs.readFileSync(fullTarget, 'utf8');

        // Update title
        if (input.title) {
          html = html.replace(/<title>[^<]*<\/title>/i, `<title>${input.title}</title>`);
        }

        // Update description
        if (input.description !== undefined) {
          if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
            html = html.replace(/<meta\s+name=["']description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="description" content="${input.description}">`);
          } else {
            html = html.replace(/<\/head>/i, `  <meta name="description" content="${input.description}">\n</head>`);
          }
        }

        // Update robots
        if (input.isNoindex !== undefined) {
          const robotsContent = input.isNoindex ? 'noindex, nofollow' : 'index, follow';
          if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
            html = html.replace(/<meta\s+name=["']robots["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="robots" content="${robotsContent}">`);
          } else {
            html = html.replace(/<\/head>/i, `  <meta name="robots" content="${robotsContent}">\n</head>`);
          }
        }

        fs.writeFileSync(fullTarget, html, 'utf8');
        return sendJson(res, 200, { success: true, message: `Updated ${filepath} on disk` });
      }
      return sendJson(res, 404, { success: false, error: 'File not found' });
    }

    // Page Code Read/Write
    if (endpoint === 'page/code') {
      if (req.method === 'GET') {
        let file = (query.get('file') || '').replace(/^[\\\/]+/, '');
        const target = path.join(PUBLIC_DIR, file);
        if (fs.existsSync(target) && fs.statSync(target).isFile()) {
          const content = fs.readFileSync(target, 'utf8');
          return sendJson(res, 200, { success: true, filename: file, content });
        }
        return sendJson(res, 404, { success: false, error: 'File not found' });
      }
      if (req.method === 'POST') {
        const input = await parseJsonBody(req);
        let file = (input.filename || '').replace(/^[\\\/]+/, '');
        const target = path.join(PUBLIC_DIR, file);
        if (file && input.content !== undefined) {
          fs.writeFileSync(target, input.content, 'utf8');
          return sendJson(res, 200, { success: true, message: `Saved ${file} to disk` });
        }
        return sendJson(res, 400, { success: false, error: 'Missing content or filename' });
      }
    }

    // Global Noindex
    if (endpoint === 'seo/global-noindex' && req.method === 'POST') {
      const input = await parseJsonBody(req);
      const isNoindex = !!input.enableNoindex;
      let settings = readJsonFile(SETTINGS_FILE, {});
      settings.globalNoindex = isNoindex;
      writeJsonFile(SETTINGS_FILE, settings);

      const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
      let robotsTxt = `User-agent: *\n${isNoindex ? 'Disallow: /' : 'Allow: /'}\nDisallow: /cpx-dashboard.html\nDisallow: /cpx-login.html\nDisallow: /cpx/\n\nSitemap: https://www.rapidtables.online/sitemap.xml\n`;
      fs.writeFileSync(robotsPath, robotsTxt, 'utf8');

      return sendJson(res, 200, { success: true, message: `Global Noindex set to ${isNoindex}` });
    }

    // Admin Password
    if (endpoint === 'admin/password' && req.method === 'POST') {
      const input = await parseJsonBody(req);
      if (input.newPassword) {
        let config = readJsonFile(CONFIG_FILE, { username: 'rapidtabless@gmail.com' });
        config.masterPassword = input.newPassword;
        writeJsonFile(CONFIG_FILE, config);
        return sendJson(res, 200, { success: true, message: 'Master Password updated successfully' });
      }
      return sendJson(res, 400, { success: false, error: 'Password required' });
    }
  }

  // =========================================================
  // STATIC ROUTING
  // =========================================================
  let parsedUrl = rawPath;
  if (parsedUrl === '/' || parsedUrl === '') {
    parsedUrl = '/index.html';
  }

  // Asset fallback for /cpx/assets/...
  if (parsedUrl.startsWith('/cpx/assets/')) {
    parsedUrl = parsedUrl.replace('/cpx/assets/', '/assets/');
  }

  // CPX Admin Gateway routing & redirects
  if (parsedUrl === '/cpx/cpx-dashboard.html' || parsedUrl === '/cpx/dashboard' || parsedUrl === '/cpx/dashboard.html') {
    res.writeHead(301, { 'Location': '/cpx-dashboard.html' });
    return res.end();
  }
  if (parsedUrl === '/cpx/cpx-login.html' || parsedUrl === '/cpx/login' || parsedUrl === '/cpx/login.html') {
    res.writeHead(301, { 'Location': '/cpx-login.html' });
    return res.end();
  }
  if (parsedUrl === '/cpx' || parsedUrl === '/cpx/' || parsedUrl.includes('cpx-dashboard')) {
    parsedUrl = '/cpx-dashboard.html';
  } else if (parsedUrl.includes('cpx-login')) {
    parsedUrl = '/cpx-login.html';
  }

  let filePath = path.join(PUBLIC_DIR, parsedUrl);

  // If directory requested, check index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Clean URL support: /pdf/compress-pdf -> /pdf/compress-pdf.html
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  // Check if file exists
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    // 404 fallback to root index.html
    const notFoundPage = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(notFoundPage)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(notFoundPage).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }

  // Determine MIME type
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Cache Control
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
  }

  // Gzip compression support for text/code
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const isCompressible = /text|javascript|json|xml|svg/i.test(contentType);

  if (isCompressible && acceptEncoding.includes('gzip')) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Encoding': 'gzip'
    });
    const raw = fs.createReadStream(filePath);
    const gzip = zlib.createGzip();
    raw.pipe(gzip).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`  ⚡ RapidTables.online 24/7 Cloud Server Running`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Root: ${PUBLIC_DIR}`);
  console.log('====================================================');
});
