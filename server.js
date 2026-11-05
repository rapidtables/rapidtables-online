/**
 * RapidTables.online - 24/7 Production Web Server
 * Zero-dependency native Node.js server (Runs on any Linux/VPS without needing npm install)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 80;
const PUBLIC_DIR = __dirname;

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

const server = http.createServer((req, res) => {
  // Canonical Redirect: non-www to www (if live on production)
  const host = req.headers.host || '';
  if (host === 'rapidtables.online') {
    res.writeHead(301, { 'Location': 'https://www.rapidtables.online' + req.url });
    return res.end();
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() }));
  }

  // Parse path
  let parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/' || parsedUrl === '') {
    parsedUrl = '/index.html';
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
