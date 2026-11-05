#!/usr/bin/env bash
# ==============================================================================
# RapidTables.online - AWS EC2 (Free Tier) 1-Click Deployment Script
# OS: Ubuntu 22.04 / 24.04 LTS (t2.micro / t3.micro)
# ==============================================================================

set -e

echo "=================================================================="
echo "  ⚡ RapidTables.online - AWS EC2 24/7 Cloud Deployment"
echo "=================================================================="

# Check root permissions
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script with sudo (e.g. sudo bash aws-setup.sh)"
  exit 1
fi

APP_DIR="/var/www/rapidtables-online"

echo "📦 Step 1: Updating System & Installing Node.js, Git..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y curl git

# Install Node.js 20 LTS if not installed
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 (Process Manager for 24/7 continuous running)
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2..."
  npm install -g pm2
fi

echo "📁 Step 2: Preparing Application Files..."
if [ -f "./server.js" ]; then
  echo "Copying files from current folder..."
  mkdir -p "$APP_DIR"
  cp -r ./* "$APP_DIR/" 2>/dev/null || true
  cd "$APP_DIR"
elif [ -n "$1" ]; then
  echo "Cloning from GitHub: $1..."
  rm -rf "$APP_DIR"
  git clone "$1" "$APP_DIR"
  cd "$APP_DIR"
else
  read -p "Enter your GitHub Repo URL (or press Enter if files are already here): " REPO_URL
  if [ -n "$REPO_URL" ]; then
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi
fi

echo "🚀 Step 3: Starting Server on Port 80 via PM2..."
cd "$APP_DIR"

# Clean previous instance if exists
pm2 delete rapidtables 2>/dev/null || true

# Start server on Port 80
PORT=80 pm2 start server.js --name "rapidtables"

# Setup PM2 to auto-start on EC2 instance reboot
pm2 startup systemd -u root --hp /root || true
pm2 save

echo ""
echo "=================================================================="
echo "  🎉 AWS EC2 DEPLOYMENT SUCCESSFUL! 24/7 LIVE!"
echo "=================================================================="
echo "  • Server: Running in background via PM2 on Port 80"
echo "  • PC Status: Aap apna computer mukammal band kar sakte hain!"
echo "  • Public Access: EC2 Public IPv4 address open karein"
echo "  • View Status: 'pm2 status' ya 'pm2 logs rapidtables'"
echo "=================================================================="
