# RapidTables.online ⚡

> Free, High-Precision Online Calculators, Unit Converters & 100% Client-Side PDF Tools Suite.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Production](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](https://www.rapidtables.online/)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Zero%20Uploads-brightgreen.svg)](https://www.rapidtables.online/)

---

## 🚀 Key Highlights & Features

- **🔒 100% Client-Side Architecture:** All calculations, document conversions, and PDF manipulations execute exclusively in visitor browser RAM via WebAssembly and Canvas. Zero server uploads, zero data collection.
- **⚡ 25+ Advanced PDF Utilities:** Compress, PDF to Word/Excel/PowerPoint, OCR text extraction, PDF/A archiving, page deletion, extraction, visual cropping, permanent redaction, electronic signatures, and watermarking.
- **📱 Responsive & Mobile-Optimized:** Mobile bottom-drawers, instant search with keyboard shortcuts (`Ctrl+K`), sticky quick category carousels, and dark/light mode toggle.
- **🌐 SEO Ready:** Clean canonical URLs, responsive metadata, `robots.txt`, and exhaustive `sitemap.xml`.

---

## 📁 Repository Structure

```
rapidtables-online/
├── index.html                  # Homepage (100+ Tools Directory)
├── sitemap.xml                 # Canonical XML Sitemap
├── robots.txt                  # Search Engine Directives
├── assets/
│   ├── css/style.css           # Universal Responsive CSS & Themes
│   └── js/
│       ├── app.js              # Theme switcher, mobile search & drawer
│       └── search-index.js     # Instant search autocomplete index
├── pdf/                        # PDF Suite (25+ Tools)
│   ├── index.html              # PDF Suite Hub
│   ├── compress-pdf.html       # Compress PDF
│   ├── pdf-to-word.html        # PDF to Word (.docx)
│   ├── pdf-to-excel.html       # PDF to Excel (.xlsx, .csv)
│   ├── pdf-to-ppt.html         # PDF to PowerPoint (.pptx)
│   ├── word-to-pdf.html        # Word to PDF
│   ├── excel-to-pdf.html       # Excel to PDF
│   ├── ppt-to-pdf.html         # PowerPoint to PDF
│   ├── pdf-reader.html         # In-browser PDF Reader / Viewer
│   ├── edit-pdf.html           # Visual PDF Annotator / Editor
│   ├── redact-pdf.html         # Permanent Blackout Redaction
│   ├── crop-pdf.html           # Crop Margins & Boundaries
│   ├── delete-pdf-pages.html   # Delete PDF Pages
│   ├── extract-pdf-pages.html  # Extract PDF Pages
│   └── ...
├── calc/                       # Math, Finance, Health, Electrical Calculators
├── convert/                    # Universal Unit Converters
├── tools/                      # Web & Developer Tools (QR, Notepad, Diff, Regex)
└── deploy/                     # Automated VPS & Webhook Scripts
    └── deploy-vps.sh           # 1-Click Oracle Cloud Ubuntu Deployment
```

---

## 🛠️ Deploying to Hostinger via GitHub (Auto-Deployment)

1. Create a repository on GitHub (e.g. `rapidtables-online`).
2. Push this directory to your repository.
3. Open **Hostinger hPanel** &rarr; **Websites** &rarr; Select `rapidtables.online`.
4. Navigate to **Advanced** &rarr; **Git**.
5. Paste your GitHub repository URL:
   - Branch: `main`
   - Install directory: `public_html`
6. Click **Create**.
7. Copy the **Auto-Deployment Webhook URL** from Hostinger and paste it into GitHub (**Settings &rarr; Webhooks &rarr; Add Webhook**).
8. Now every `git push` automatically updates your live website in seconds!

---

## ☁️ Deploying to Oracle Cloud Always-Free VPS

Run the included automated setup script on your clean Ubuntu VPS:

```bash
curl -sSL https://raw.githubusercontent.com/<YOUR-USERNAME>/<YOUR-REPO>/main/deploy/deploy-vps.sh | sudo bash
```

The script will automatically:
1. Install and optimize Nginx.
2. Open Ubuntu & Oracle VCN firewall ports (80 and 443).
3. Set up domain blocks with 301 canonical redirects to `https://www.rapidtables.online`.
4. Install Let's Encrypt SSL with auto-renewal.
5. Clone the repository and configure periodic auto-pull updates.

---

&copy; 2026 RapidTables.online &bull; MIT License
