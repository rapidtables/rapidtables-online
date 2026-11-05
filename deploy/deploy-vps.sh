#!/usr/bin/env bash
# ==============================================================================
# RapidTables.online - Oracle Cloud VPS Always-Free Automated Deployment Script
# OS Support: Ubuntu 20.04 / 22.04 / 24.04 LTS & Debian 11 / 12
# ==============================================================================

set -e

# Configuration Defaults
DOMAIN="rapidtables.online"
WWW_DOMAIN="www.rapidtables.online"
WEB_ROOT="/var/www/rapidtables-online"
DEFAULT_REPO="https://github.com/USERNAME/rapidtables-online.git"

echo "=================================================================="
echo "  ⚡ RapidTables.online - Automated Oracle Cloud VPS Setup"
echo "=================================================================="

# Check root permissions
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root (sudo bash deploy-vps.sh)."
  exit 1
fi

# Prompt for GitHub Repository URL if not passed
if [ -z "$1" ]; then
  read -p "Enter your GitHub Repository HTTPS URL (e.g. https://github.com/yourname/rapidtables.online.git): " REPO_URL
else
  REPO_URL="$1"
fi

# Prompt for Admin Email for SSL
if [ -z "$2" ]; then
  read -p "Enter your Email for Let's Encrypt SSL certificate alerts: " SSL_EMAIL
else
  SSL_EMAIL="$2"
fi

echo ""
echo "🚀 Step 1: Updating System Packages..."
apt-get update -y
apt-get upgrade -y

echo "📦 Step 2: Installing Required Tools (Nginx, Git, Certbot, iptables-persistent)..."
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx git certbot python3-certbot-nginx curl iptables-persistent

echo "🛡️ Step 3: Configuring Oracle Cloud Firewall & IPTables..."
# Oracle Cloud Ubuntu images include strict custom iptables that drop inbound 80/443.
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
netfilter-persistent save || true

# Also configure UFW if active
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw allow 22/tcp || true
  ufw --force enable || true
fi

echo "📁 Step 4: Setting up Website Files from GitHub..."
mkdir -p /var/www
if [ -d "$WEB_ROOT/.git" ]; then
  echo "Existing Git repository found at $WEB_ROOT. Pulling latest updates..."
  cd "$WEB_ROOT"
  git fetch --all
  git reset --hard origin/main || git reset --hard origin/master
else
  echo "Cloning repository from $REPO_URL to $WEB_ROOT..."
  rm -rf "$WEB_ROOT"
  git clone "$REPO_URL" "$WEB_ROOT"
fi

# Permissions
chown -R www-data:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 755 {} \;
find "$WEB_ROOT" -type f -exec chmod 644 {} \;

echo "⚙️ Step 5: Configuring Optimized Nginx Server Block..."
cat << 'EOF' > /etc/nginx/sites-available/rapidtables.online
server {
    listen 80;
    listen [::]:80;
    server_name rapidtables.online www.rapidtables.online;

    root /var/www/rapidtables-online;
    index index.html;

    # Performance: Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml font/woff font/woff2 image/svg+xml;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static Assets Caching
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # Clean URL and Static Routing
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # Error Pages
    error_page 404 /index.html;
}
EOF

# Enable Site and Remove Default
ln -sf /etc/nginx/sites-available/rapidtables.online /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx Config
nginx -t
systemctl restart nginx

echo "🔒 Step 6: Obtaining Let's Encrypt Free SSL Certificate..."
if [ -n "$SSL_EMAIL" ]; then
  certbot --nginx --non-interactive --agree-tos --email "$SSL_EMAIL" \
    -d "$DOMAIN" -d "$WWW_DOMAIN" --redirect || {
      echo "⚠️ SSL Notice: Certbot could not verify DNS yet. Make sure your DNS A-Records for $DOMAIN and $WWW_DOMAIN point to this VPS Public IP, then run 'certbot --nginx' manually."
    }
fi

echo "🔄 Step 7: Setting up Automatic GitHub Sync (Auto-Update Cron)..."
cat << 'EOF' > /var/www/rapidtables-online/deploy/auto-pull.sh
#!/usr/bin/env bash
cd /var/www/rapidtables-online
git fetch origin main >/dev/null 2>&1
DIFF=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$DIFF" != "$REMOTE" ]; then
  git reset --hard origin/main >/dev/null 2>&1
  chown -R www-data:www-data /var/www/rapidtables-online
  echo "[$(date)] RapidTables updated from GitHub" >> /var/log/rapidtables-deploy.log
fi
EOF

chmod +x /var/www/rapidtables-online/deploy/auto-pull.sh

# Add to crontab to check every 3 minutes
(crontab -l 2>/dev/null | grep -v 'auto-pull.sh'; echo "*/3 * * * * /bin/bash /var/www/rapidtables-online/deploy/auto-pull.sh") | crontab -

echo ""
echo "=================================================================="
echo "  🎉 Deployment Complete! RapidTables is Live 24/7!"
echo "=================================================================="
echo "  • Web Directory: $WEB_ROOT"
echo "  • Nginx Status: Active & Running"
echo "  • Auto-Sync: Runs every 3 minutes from GitHub"
echo "  • Free SSL: Auto-renews via Certbot"
echo "=================================================================="
