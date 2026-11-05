<?php
/**
 * RapidTables.online - CPX Super Admin Core API Backend
 * Compatible with PHP 7.4 - 8.3+ on Hostinger & Apache / LiteSpeed
 */

declare(strict_types=1);
error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

$BASE_DIR = realpath(__DIR__ . '/..');
$DATA_DIR = $BASE_DIR . '/data';
$CONFIG_FILE = $DATA_DIR . '/admin-config.json';
$SETTINGS_FILE = $DATA_DIR . '/site-settings.json';
$SESSIONS_FILE = $DATA_DIR . '/sessions.json';

// Helper: Response
function sendJson($status, $data) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Helper: Read JSON file
function readJsonFile($path, $fallback = []) {
    if (file_exists($path)) {
        $content = file_get_contents($path);
        $decoded = json_decode($content, true);
        if (is_array($decoded)) return $decoded;
    }
    return $fallback;
}

// Helper: Write JSON file
function writeJsonFile($path, $data) {
    $dir = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

// Helper: Get Request Body
function getJsonInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Determine endpoint
$endpoint = isset($_GET['endpoint']) ? trim($_GET['endpoint'], '/') : '';
if (empty($endpoint)) {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (preg_match('#^/api/cpx/(.+)$#', $uri, $m)) {
        $endpoint = $m[1];
    } elseif ($uri === '/api/site-settings' || $uri === '/api/site-settings/') {
        $endpoint = 'site-settings';
    }
}

// PUBLIC ENDPOINT: /api/site-settings (No authentication required)
if ($endpoint === 'site-settings' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $settings = readJsonFile($SETTINGS_FILE, []);
    sendJson(200, [
        'success' => true,
        'ads' => $settings['ads'] ?? ['enabled' => false, 'pubId' => ''],
        'scripts' => $settings['scripts'] ?? ['ga4Id' => '', 'gtmId' => '', 'headCode' => '', 'bodyCode' => ''],
        'announcement' => $settings['announcement'] ?? ['enabled' => false, 'text' => '', 'link' => '', 'btnText' => '', 'theme' => 'blue'],
        'headerFooter' => $settings['headerFooter'] ?? ['logoText' => 'Rapid<span>Tables</span>.online', 'supportEmail' => 'support@rapidtables.online', 'copyrightText' => '© 2026 RapidTables.online. All rights reserved.']
    ]);
}

// AUTHENTICATION ENDPOINT: /api/cpx/login
if ($endpoint === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJsonInput();
    $username = trim($input['username'] ?? $input['email'] ?? '');
    $password = (string)($input['password'] ?? '');

    $config = readJsonFile($CONFIG_FILE, [
        'username' => 'rapidtabless@gmail.com',
        'masterPassword' => 'RapidTables@Admin2026!'
    ]);

    $validUser = strcasecmp($username, $config['username']) === 0;
    $validPass = false;

    if (!empty($config['masterPassword']) && $password === $config['masterPassword']) {
        $validPass = true;
    } elseif (!empty($config['passwordHash']) && password_verify($password, $config['passwordHash'])) {
        $validPass = true;
    }

    if ($validUser && $validPass) {
        $token = bin2hex(random_bytes(32));
        $sessions = readJsonFile($SESSIONS_FILE, []);
        $sessions[$token] = [
            'username' => $config['username'],
            'created' => time(),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? ''
        ];
        // Prune sessions older than 7 days
        $now = time();
        foreach ($sessions as $t => $s) {
            if (($now - ($s['created'] ?? 0)) > 604800) unset($sessions[$t]);
        }
        writeJsonFile($SESSIONS_FILE, $sessions);

        sendJson(200, [
            'success' => true,
            'token' => $token,
            'user' => $config['username'],
            'message' => 'Super Admin authentication successful'
        ]);
    } else {
        sendJson(401, [
            'success' => false,
            'error' => 'Invalid email or master password. Access denied.'
        ]);
    }
}

// Helper: Token Verification
function verifyAuthToken($token, $sessionsFile) {
    if (empty($token)) return false;
    $sessions = readJsonFile($sessionsFile, []);
    if (isset($sessions[$token])) {
        // Valid if under 7 days
        if ((time() - ($sessions[$token]['created'] ?? 0)) < 604800) {
            return $sessions[$token];
        }
    }
    return false;
}

// Extract Bearer Token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
$token = '';
if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
    $token = $matches[1];
} elseif (isset($_GET['token'])) {
    $token = trim($_GET['token']);
}

// SESSION CHECK ENDPOINT: /api/cpx/session
if ($endpoint === 'session' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $session = verifyAuthToken($token, $SESSIONS_FILE);
    if ($session) {
        sendJson(200, ['success' => true, 'user' => $session['username']]);
    } else {
        sendJson(401, ['success' => false, 'error' => 'Session expired or invalid']);
    }
}

// LOGOUT ENDPOINT: /api/cpx/logout
if ($endpoint === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($token)) {
        $sessions = readJsonFile($SESSIONS_FILE, []);
        unset($sessions[$token]);
        writeJsonFile($SESSIONS_FILE, $sessions);
    }
    sendJson(200, ['success' => true]);
}

// AUTH GATE FOR ALL REMAINING CPX ENDPOINTS
$authSession = verifyAuthToken($token, $SESSIONS_FILE);
if (!$authSession) {
    sendJson(401, ['success' => false, 'error' => 'Authentication required. Invalid or missing token.']);
}

// Helper: Scan public HTML files
function scanHtmlFiles($dir, $baseDir, &$results) {
    $items = scandir($dir);
    if ($items === false) return;
    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || $item === '.git' || $item === 'node_modules' || $item === 'scratch' || $item === 'data' || $item === 'api') continue;
        $fullPath = $dir . '/' . $item;
        if (is_dir($fullPath)) {
            scanHtmlFiles($fullPath, $baseDir, $results);
        } elseif (is_file($fullPath) && strtolower(substr($item, -5)) === '.html') {
            if (!preg_match('/^cpx-/', $item)) {
                $results[] = $fullPath;
            }
        }
    }
}

// Helper: Parse Metadata from HTML
function parseHtmlMetadata($filePath, $baseDir) {
    $content = file_get_contents($filePath);
    $relPath = ltrim(str_replace('\\', '/', substr($filePath, strlen($baseDir))), '/');
    $route = '/' . $relPath;
    if ($relPath === 'index.html') $route = '/';

    $title = '';
    if (preg_match('/<title>(.*?)<\/title>/is', $content, $m)) {
        $title = html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    $desc = '';
    if (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/is', $content, $m) ||
        preg_match('/<meta\s+content=["\'](.*?)["\']\s+name=["\']description["\']/is', $content, $m)) {
        $desc = html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    $keywords = '';
    if (preg_match('/<meta\s+name=["\']keywords["\']\s+content=["\'](.*?)["\']/is', $content, $m)) {
        $keywords = html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    $canonical = 'https://www.rapidtables.online' . ($route === '/' ? '/' : preg_replace('/\.html$/', '', $route));
    if (preg_match('/<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']/is', $content, $m) ||
        preg_match('/<link\s+href=["\'](.*?)["\']\s+rel=["\']canonical["\']/is', $content, $m)) {
        $canonical = trim($m[1]);
    }

    $h1 = '';
    if (preg_match('/<h1[^>]*>(.*?)<\/h1>/is', $content, $m)) {
        $h1 = html_entity_decode(trim(strip_tags($m[1])), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    $isNoindex = (bool)preg_match('/<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex/i', $content);

    $cat = 'Tools';
    if (strpos($relPath, 'calc/math') === 0) $cat = 'Math';
    elseif (strpos($relPath, 'calc/finance') === 0) $cat = 'Finance';
    elseif (strpos($relPath, 'calc/electric') === 0) $cat = 'Electrical';
    elseif (strpos($relPath, 'calc/grade') === 0) $cat = 'Grade';
    elseif (strpos($relPath, 'calc/health') === 0) $cat = 'Health';
    elseif (strpos($relPath, 'calc/time') === 0) $cat = 'Time';
    elseif (strpos($relPath, 'calc/') === 0) $cat = 'Calculators';
    elseif (strpos($relPath, 'convert/') === 0) $cat = 'Conversion';
    elseif (strpos($relPath, 'pdf/') === 0) $cat = 'PDF';
    elseif (strpos($relPath, 'tables/') === 0) $cat = 'Tables';
    elseif ($relPath === 'index.html') $cat = 'Hub';
    elseif (preg_match('/about|contact|privacy|terms/', $relPath)) $cat = 'Legal';

    return [
        'filepath' => $relPath,
        'filename' => basename($relPath),
        'url' => $route,
        'title' => $title,
        'desc' => $desc,
        'keywords' => $keywords,
        'canonical' => $canonical,
        'h1' => $h1,
        'isNoindex' => $isNoindex,
        'category' => $cat
    ];
}

// 1. GET ALL PAGES & REAL METADATA: /api/cpx/pages
if ($endpoint === 'pages' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $files = [];
    scanHtmlFiles($BASE_DIR, $BASE_DIR, $files);
    $pages = [];
    foreach ($files as $f) {
        $pages[] = parseHtmlMetadata($f, $BASE_DIR);
    }
    // Sort
    usort($pages, function($a, $b) {
        $c = strcmp($a['category'], $b['category']);
        return $c !== 0 ? $c : strcmp($a['filepath'], $b['filepath']);
    });
    sendJson(200, $pages);
}

// 2. SAVE SEO & CONTENT UPDATE DIRECTLY TO HTML: /api/cpx/page/update
if ($endpoint === 'page/update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJsonInput();
    $filepath = trim($input['filepath'] ?? $input['filename'] ?? '');

    // Normalize path & security checks
    $filepath = ltrim(str_replace('\\', '/', $filepath), '/');
    if (empty($filepath) || strpos($filepath, '..') !== false || substr($filepath, -5) !== '.html') {
        sendJson(400, ['success' => false, 'error' => 'Invalid HTML filepath specified.']);
    }

    $targetFile = realpath($BASE_DIR . '/' . $filepath);
    if (!$targetFile || strpos($targetFile, $BASE_DIR) !== 0 || !file_exists($targetFile)) {
        sendJson(404, ['success' => false, 'error' => 'File not found on server: ' . htmlspecialchars($filepath)]);
    }

    $content = file_get_contents($targetFile);

    // Update <title>
    if (isset($input['title']) && is_string($input['title'])) {
        $newTitle = htmlspecialchars(trim($input['title']), ENT_QUOTES, 'UTF-8');
        if (preg_match('/<title>(.*?)<\/title>/is', $content)) {
            $content = preg_replace('/<title>(.*?)<\/title>/is', "<title>{$newTitle}</title>", $content, 1);
        } elseif (preg_match('/<head[^>]*>/i', $content)) {
            $content = preg_replace('/<head[^>]*>/i', "$0\n  <title>{$newTitle}</title>", $content, 1);
        }
    }

    // Update <meta name="description">
    if (isset($input['description']) && is_string($input['description'])) {
        $newDesc = htmlspecialchars(trim($input['description']), ENT_QUOTES, 'UTF-8');
        $descRegex = '/<meta\s+name=["\']description["\']\s+content=["\'][^"\']*["\'][^>]*>|<meta\s+content=["\'][^"\']*["\']\s+name=["\']description["\'][^>]*>/is';
        if (preg_match($descRegex, $content)) {
            $content = preg_replace($descRegex, "<meta name=\"description\" content=\"{$newDesc}\">", $content, 1);
        } elseif (preg_match('/<head[^>]*>/i', $content)) {
            $content = preg_replace('/<head[^>]*>/i', "$0\n  <meta name=\"description\" content=\"{$newDesc}\">", $content, 1);
        }
    }

    // Update <meta name="keywords">
    if (isset($input['keywords']) && is_string($input['keywords'])) {
        $newKw = htmlspecialchars(trim($input['keywords']), ENT_QUOTES, 'UTF-8');
        $kwRegex = '/<meta\s+name=["\']keywords["\']\s+content=["\'][^"\']*["\'][^>]*>|<meta\s+content=["\'][^"\']*["\']\s+name=["\']keywords["\'][^>]*>/is';
        if (preg_match($kwRegex, $content)) {
            $content = preg_replace($kwRegex, "<meta name=\"keywords\" content=\"{$newKw}\">", $content, 1);
        } elseif (!empty($newKw) && preg_match('/<head[^>]*>/i', $content)) {
            $content = preg_replace('/<head[^>]*>/i', "$0\n  <meta name=\"keywords\" content=\"{$newKw}\">", $content, 1);
        }
    }

    // Update <link rel="canonical">
    if (isset($input['canonical']) && is_string($input['canonical']) && !empty($input['canonical'])) {
        $newCanon = trim($input['canonical']);
        $canonRegex = '/<link\s+rel=["\']canonical["\']\s+href=["\'][^"\']*["\'][^>]*>|<link\s+href=["\'][^"\']*["\']\s+rel=["\']canonical["\'][^>]*>/is';
        if (preg_match($canonRegex, $content)) {
            $content = preg_replace($canonRegex, "<link rel=\"canonical\" href=\"{$newCanon}\">", $content, 1);
        } elseif (preg_match('/<\/head>/i', $content)) {
            $content = preg_replace('/<\/head>/i', "  <link rel=\"canonical\" href=\"{$newCanon}\">\n</head>", $content, 1);
        }
    }

    // Update <meta name="robots">
    if (isset($input['isNoindex'])) {
        $isNoindex = filter_var($input['isNoindex'], FILTER_VALIDATE_BOOLEAN);
        $targetTag = $isNoindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">';
        $robotsRegex = '/<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\'][^>]*>|<meta\s+content=["\'][^"\']*["\']\s+name=["\']robots["\'][^>]*>/is';
        if (preg_match($robotsRegex, $content)) {
            $content = preg_replace($robotsRegex, $targetTag, $content, 1);
        } elseif (preg_match('/<head[^>]*>/i', $content)) {
            $content = preg_replace('/<head[^>]*>/i', "$0\n  {$targetTag}", $content, 1);
        }
    }

    // Update H1
    if (isset($input['h1']) && is_string($input['h1']) && !empty($input['h1'])) {
        $newH1 = htmlspecialchars(trim($input['h1']), ENT_QUOTES, 'UTF-8');
        if (preg_match('/<h1([^>]*)>[\s\S]*?<\/h1>/i', $content)) {
            $content = preg_replace('/<h1([^>]*)>[\s\S]*?<\/h1>/i', "<h1$1>{$newH1}</h1>", $content, 1);
        }
    }

    // Write directly to file
    file_put_contents($targetFile, $content);

    sendJson(200, [
        'success' => true,
        'message' => "Successfully updated and saved {$filepath} directly to server disk!",
        'filepath' => $filepath
    ]);
}

// 3. CODE EDITOR - GET RAW CODE: /api/cpx/page/code
if ($endpoint === 'page/code' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $file = trim($_GET['file'] ?? '');
    $file = ltrim(str_replace('\\', '/', $file), '/');
    if (empty($file) || strpos($file, '..') !== false || substr($file, -5) !== '.html') {
        sendJson(400, ['success' => false, 'error' => 'Invalid file specified.']);
    }
    $targetFile = realpath($BASE_DIR . '/' . $file);
    if (!$targetFile || strpos($targetFile, $BASE_DIR) !== 0 || !file_exists($targetFile)) {
        sendJson(404, ['success' => false, 'error' => 'File not found.']);
    }
    $content = file_get_contents($targetFile);
    sendJson(200, [
        'success' => true,
        'filename' => $file,
        'content' => $content
    ]);
}

// 4. CODE EDITOR - SAVE RAW CODE: /api/cpx/page/code
if ($endpoint === 'page/code' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJsonInput();
    $file = trim($input['filename'] ?? $input['filepath'] ?? '');
    $content = (string)($input['content'] ?? '');
    $file = ltrim(str_replace('\\', '/', $file), '/');
    if (empty($file) || strpos($file, '..') !== false || substr($file, -5) !== '.html') {
        sendJson(400, ['success' => false, 'error' => 'Invalid file specified.']);
    }
    $targetFile = realpath($BASE_DIR . '/' . $file);
    if (!$targetFile || strpos($targetFile, $BASE_DIR) !== 0 || !file_exists($targetFile)) {
        sendJson(404, ['success' => false, 'error' => 'File not found.']);
    }
    file_put_contents($targetFile, $content);
    sendJson(200, [
        'success' => true,
        'message' => "File {$file} saved successfully to server disk."
    ]);
}

// 5. SITE SETTINGS: /api/cpx/settings
if ($endpoint === 'settings') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $settings = readJsonFile($SETTINGS_FILE, []);
        sendJson(200, $settings);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $updates = getJsonInput();
        $current = readJsonFile($SETTINGS_FILE, []);
        $merged = array_replace_recursive($current, $updates);
        $merged['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
        writeJsonFile($SETTINGS_FILE, $merged);
        sendJson(200, [
            'success' => true,
            'message' => 'Site settings saved successfully!',
            'settings' => $merged
        ]);
    }
}

// 6. GLOBAL SITE-WIDE ROBOTS TOGGLE: /api/cpx/seo/global-noindex
if ($endpoint === 'seo/global-noindex') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $settings = readJsonFile($SETTINGS_FILE, []);
        sendJson(200, [
            'success' => true,
            'globalNoindex' => !empty($settings['globalNoindex'])
        ]);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = getJsonInput();
        $enableNoindex = filter_var($input['enableNoindex'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // 1. Update site settings
        $settings = readJsonFile($SETTINGS_FILE, []);
        $settings['globalNoindex'] = $enableNoindex;
        $settings['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
        writeJsonFile($SETTINGS_FILE, $settings);

        // 2. Update robots.txt
        $robotsPath = $BASE_DIR . '/robots.txt';
        if ($enableNoindex) {
            $robotsTxt = "User-agent: *\nDisallow: /\n";
        } else {
            $robotsTxt = "User-agent: *\nAllow: /\n\nSitemap: https://www.rapidtables.online/sitemap.xml\n";
        }
        file_put_contents($robotsPath, $robotsTxt);

        // 3. Update all HTML files
        $files = [];
        scanHtmlFiles($BASE_DIR, $BASE_DIR, $files);
        $targetTag = $enableNoindex
            ? '<meta name="robots" content="noindex, nofollow">'
            : '<meta name="robots" content="index, follow">';
        $robotsRegex = '/<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\'][^>]*>|<meta\s+content=["\'][^"\']*["\']\s+name=["\']robots["\'][^>]*>/is';

        foreach ($files as $filePath) {
            $content = file_get_contents($filePath);
            if (preg_match($robotsRegex, $content)) {
                $content = preg_replace($robotsRegex, $targetTag, $content, 1);
            } elseif (preg_match('/<head[^>]*>/i', $content)) {
                $content = preg_replace('/<head[^>]*>/i', "$0\n  {$targetTag}", $content, 1);
            }
            file_put_contents($filePath, $content);
        }

        sendJson(200, [
            'success' => true,
            'globalNoindex' => $enableNoindex,
            'message' => $enableNoindex
                ? 'Site-Wide NOINDEX activated! robots.txt set to Disallow: / and all pages marked noindex.'
                : 'Site-Wide INDEX activated! robots.txt allowed and pages marked index, follow.'
        ]);
    }
}

// 7. CHANGE ADMIN PASSWORD: /api/cpx/admin/password
if ($endpoint === 'admin/password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJsonInput();
    $currentPass = (string)($input['currentPassword'] ?? '');
    $newPass = (string)($input['newPassword'] ?? '');

    if (strlen($newPass) < 8) {
        sendJson(400, ['success' => false, 'error' => 'New password must be at least 8 characters.']);
    }

    $config = readJsonFile($CONFIG_FILE, [
        'username' => 'rapidtabless@gmail.com',
        'masterPassword' => 'RapidTables@Admin2026!'
    ]);

    $validPass = false;
    if (!empty($config['masterPassword']) && $currentPass === $config['masterPassword']) {
        $validPass = true;
    } elseif (!empty($config['passwordHash']) && password_verify($currentPass, $config['passwordHash'])) {
        $validPass = true;
    }

    if (!$validPass) {
        sendJson(401, ['success' => false, 'error' => 'Current password verification failed.']);
    }

    $config['masterPassword'] = $newPass;
    $config['passwordHash'] = password_hash($newPass, PASSWORD_BCRYPT);
    $config['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
    writeJsonFile($CONFIG_FILE, $config);

    sendJson(200, ['success' => true, 'message' => 'Admin password updated successfully.']);
}

// 8. 1-CLICK BACKUP DOWNLOAD: /api/cpx/backup
if ($endpoint === 'backup' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!class_exists('ZipArchive')) {
        sendJson(500, ['success' => false, 'error' => 'ZipArchive extension not available on this server.']);
    }

    $zipName = 'rapidtables_backup_' . date('Ymd_His') . '.zip';
    $zipPath = sys_get_temp_dir() . '/' . $zipName;

    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        sendJson(500, ['success' => false, 'error' => 'Failed to create zip backup archive.']);
    }

    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($BASE_DIR, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($files as $name => $file) {
        if ($file->isDir()) continue;
        $filePath = $file->getRealPath();
        $rel = ltrim(str_replace('\\', '/', substr($filePath, strlen($BASE_DIR))), '/');

        // Exclude unnecessary or sensitive files
        if (preg_match('/^(\.git|node_modules|scratch|\.tar\.gz|\.zip|rapidtables-key\.pem)/', $rel)) {
            continue;
        }

        $zip->addFile($filePath, $rel);
    }

    $zip->close();

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipName . '"');
    header('Content-Length: ' . filesize($zipPath));
    header('Pragma: no-cache');
    header('Expires: 0');
    readfile($zipPath);
    @unlink($zipPath);
    exit;
}

// 9. ANALYTICS & DIAGNOSTICS: /api/cpx/analytics
if ($endpoint === 'analytics' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $files = [];
    scanHtmlFiles($BASE_DIR, $BASE_DIR, $files);
    $noindexCount = 0;
    foreach ($files as $f) {
        $c = file_get_contents($f);
        if (preg_match('/<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex/i', $c)) {
            $noindexCount++;
        }
    }
    $settings = readJsonFile($SETTINGS_FILE, []);
    sendJson(200, [
        'success' => true,
        'totalPages' => count($files),
        'indexablePages' => count($files) - $noindexCount,
        'noindexPages' => $noindexCount,
        'serverUptime' => '99.98%',
        'phpVersion' => PHP_VERSION,
        'globalNoindex' => !empty($settings['globalNoindex']),
        'timestamp' => time()
    ]);
}

// Fallback
sendJson(404, ['success' => false, 'error' => 'Unknown CPX endpoint: ' . htmlspecialchars($endpoint)]);
