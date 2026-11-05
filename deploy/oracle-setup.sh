#!/usr/bin/env bash
# ==============================================================================
# RapidTables.online - 24/7 Oracle Cloud VPS One-Click Deploy Script
# Yeh script aapke Oracle VPS par server ko 24/7 chalayegi.
# Computer band karne ke baad bhi tools hamesha live rahenge!
# ==============================================================================

set -e

echo "=================================================================="
echo "  ⚡ RapidTables.online - Oracle Cloud 24/7 Server Deploy"
echo "=================================================================="

# Check root permissions
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script with sudo (e.g. sudo bash oracle-setup.sh)"
  exit 1
fi

APP_DIR="/var/www/rapidtables-online"

echo "📦 Step 1: Installing Node.js & Git..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y curl git iptables-persistent

# Install Node.js 20 LTS if not present
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 (Process Manager to run 24/7 in background)
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2 Daemon Manager..."
  npm install -g pm2
fi

echo "🛡️ Step 2: Unlocking Oracle Cloud Firewall (Ports 80 & 443)..."
# Oracle Cloud Ubuntu images contain strict iptables rules that drop ports 80/443
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
netfilter-persistent save || true

# Check if repo URL is passed or if files are already in current directory
if [ -f "./server.js" ]; then
  echo "Using current directory files..."
  mkdir -p "$APP_DIR"
  cp -r ./* "$APP_DIR/" 2>/dev/null || true
  cd "$APP_DIR"
elif [ -n "$1" ]; then
  echo "Cloning from GitHub repo: $1..."
  rm -rf "$APP_DIR"
  git clone "$1" "$APP_DIR"
  cd "$APP_DIR"
else
  read -p "Enter your GitHub Repo HTTPS URL (or press Enter if files are already uploaded): " REPO_URL
  if [ -n "$REPO_URL" ]; then
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi
fi

echo "🚀 Step 3: Starting RapidTables Server via PM2 (24/7 Background Daemon)..."
cd "$APP_DIR"

# Stop existing instance if any
pm2 delete rapidtables 2>/dev/null || true

# Start server on Port 80
PORT=80 pm2 start server.js --name "rapidtables"

# Configure PM2 to auto-start on VPS boot
pm2 startup systemd -u root --hp /root || true
pm2 save

echo ""
echo "=================================================================="
echo "  🎉 CONGRATULATIONS! Your server is now LIVE 24/7 on Oracle VPS!"
echo "=================================================================="
echo "  • Server Status: Running in background via PM2"
echo "  • Local Computer: AB AAP APNA COMPUTER BAND KAR SAKTE HAIN!"
echo "  • Website Port: 80 (HTTP)"
echo "  • Check Status: 'pm2 status' or 'pm2 logs rapidtables'"
echo "=================================================================="
