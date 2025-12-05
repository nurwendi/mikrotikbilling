#!/bin/bash

# MikroTik Billing - Installation Script
# https://github.com/nurwendi/mikrotikbilling

set -e

echo "=============================================="
echo "  MikroTik Billing - Installation Script"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${GREEN}[1/7]${NC} Updating system..."
apt update && apt upgrade -y

echo -e "${GREEN}[2/7]${NC} Installing curl and git..."
apt install -y curl git

echo -e "${GREEN}[3/7]${NC} Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo -e "${GREEN}[4/7]${NC} Installing PM2..."
npm install -g pm2

echo -e "${GREEN}[5/7]${NC} Cloning repository..."
cd /opt
if [ -d "billing" ]; then
    echo -e "${YELLOW}Directory /opt/billing already exists. Removing...${NC}"
    rm -rf billing
fi
git clone https://github.com/nurwendi/mikrotikbilling.git billing
cd /opt/billing

echo -e "${GREEN}[6/7]${NC} Installing dependencies and building..."
npm install
npm run build

echo -e "${GREEN}[7/7]${NC} Starting application with PM2..."
pm2 start npm --name "billing" -- start
pm2 save
pm2 startup

echo ""
echo "=============================================="
echo -e "${GREEN}  Installation Complete!${NC}"
echo "=============================================="
echo ""
echo "Access the application at:"
echo -e "  ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo ""
echo "Default Login:"
echo "  Username: admin"
echo "  Password: admin"
echo ""
echo -e "${YELLOW}⚠️  Change the default password after first login!${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 logs billing     - View logs"
echo "  pm2 restart billing  - Restart app"
echo "  pm2 stop billing     - Stop app"
echo ""
