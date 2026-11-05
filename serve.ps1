$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Error starting listener on port $port : $_"
    exit 1
}

Write-Host "=========================================================="
Write-Host "  RapidTables.online Local Dev Server Running"
Write-Host "  URL: http://localhost:$port/"
Write-Host "=========================================================="

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".xml"  = "application/xml; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
}

$root = $PSScriptRoot

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $rawPath = $request.Url.LocalPath
            $urlPath = [System.Uri]::UnescapeDataString($rawPath)

            # 0. Canonical WWW Redirect: rapidtables.online -> https://www.rapidtables.online
            $hostHeader = $request.Headers["Host"]
            if ($hostHeader -and ($hostHeader.ToLower().Split(':')[0] -eq "rapidtables.online")) {
                $response.StatusCode = 301
                $response.RedirectLocation = "https://www.rapidtables.online" + $request.Url.PathAndQuery
                $response.Close()
                continue
            }

            # 1. Canonical Redirect: /index.html -> /
            if ($urlPath -eq "/index.html") {
                $response.StatusCode = 301
                $response.RedirectLocation = "/"
                $response.Close()
                continue
            }

            # 2. Redirect old /about/ routes to root pages
            if ($urlPath -eq "/about/about.html" -or $urlPath -eq "/about/" -or $urlPath -eq "/about" -or $urlPath -eq "/about/index.html") {
                $response.StatusCode = 301
                $response.RedirectLocation = "/about.html"
                $response.Close()
                continue
            }
            if ($urlPath -eq "/about/privacy.html" -or $urlPath -eq "/about/privacy") {
                $response.StatusCode = 301
                $response.RedirectLocation = "/privacy.html"
                $response.Close()
                continue
            }
            if ($urlPath -eq "/about/terms.html" -or $urlPath -eq "/about/terms") {
                $response.StatusCode = 301
                $response.RedirectLocation = "/terms.html"
                $response.Close()
                continue
            }
            if ($urlPath -eq "/about/contact.html" -or $urlPath -eq "/about/contact") {
                $response.StatusCode = 301
                $response.RedirectLocation = "/contact.html"
                $response.Close()
                continue
            }

            # 3. Canonical Redirect: /dir/index.html -> /dir/
            if ($urlPath.EndsWith("/index.html") -and $urlPath.Length -gt 11) {
                $cleanDir = $urlPath.Substring(0, $urlPath.Length - 10)
                $response.StatusCode = 301
                $response.RedirectLocation = $cleanDir
                $response.Close()
                continue
            }

            # 4. Directory Trailing Slash Redirect
            $relCheck = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $checkPath = [System.IO.Path]::Combine($root, $relCheck)
            if (Test-Path $checkPath -PathType Container) {
                if (-not $urlPath.EndsWith("/")) {
                    $response.StatusCode = 301
                    $response.RedirectLocation = $urlPath + "/"
                    $response.Close()
                    continue
                }
            }

            $servePath = $urlPath
            if ($servePath -eq "/" -or $servePath -eq "") {
                $servePath = "/index.html"
            } elseif ($servePath.EndsWith("/")) {
                $servePath += "index.html"
            }

            $relPath = $servePath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $filePath = [System.IO.Path]::Combine($root, $relPath)

            # Support extensionless HTML paths (e.g. /about/privacy -> about/privacy.html)
            if (-not (Test-Path $filePath -PathType Leaf) -and (Test-Path ($filePath + ".html") -PathType Leaf)) {
                $filePath = $filePath + ".html"
            }

            # Security: ensure file is within root directory
            $fullFilePath = [System.IO.Path]::GetFullPath($filePath)
            $fullRoot = [System.IO.Path]::GetFullPath($root)

            if ($fullFilePath.StartsWith($fullRoot) -and (Test-Path $fullFilePath -PathType Leaf)) {
                $ext = [System.IO.Path]::GetExtension($fullFilePath).ToLower()
                $mime = "application/octet-stream"
                if ($mimeTypes.ContainsKey($ext)) {
                    $mime = $mimeTypes[$ext]
                }
                $response.ContentType = $mime
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                $response.Headers.Add("Pragma", "no-cache")
                $response.Headers.Add("Expires", "0")

                $bytes = [System.IO.File]::ReadAllBytes($fullFilePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        } catch {
            $response.StatusCode = 500
        } finally {
            try { $response.OutputStream.Close() } catch {}
        }
    }
} finally {
    try {
        $listener.Stop()
        $listener.Close()
    } catch {}
}
