#!/bin/bash

# MikroTik Billing - Uninstallation Script
# https://github.com/nurwendi/mikrotikbilling

echo "=============================================="
echo "  MikroTik Billing - Uninstall Script"
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

echo -e "${YELLOW}This will remove MikroTik Billing from your system.${NC}"
echo ""
read -p "Do you want to backup data before uninstalling? (y/n): " backup_choice

if [ "$backup_choice" = "y" ] || [ "$backup_choice" = "Y" ]; then
    echo ""
    echo -e "${GREEN}[1/4]${NC} Backing up data..."
    BACKUP_DIR=~/billing-backup-$(date +%Y%m%d-%H%M%S)
    mkdir -p $BACKUP_DIR
    
    if [ -d "/opt/billing" ]; then
        cp -f /opt/billing/config.json $BACKUP_DIR/ 2>/dev/null || true
        cp -f /opt/billing/customer-data.json $BACKUP_DIR/ 2>/dev/null || true
        cp -f /opt/billing/app-settings.json $BACKUP_DIR/ 2>/dev/null || true
        cp -f /opt/billing/billing-settings.json $BACKUP_DIR/ 2>/dev/null || true
        cp -rf /opt/billing/data $BACKUP_DIR/ 2>/dev/null || true
        cp -rf /opt/billing/backups $BACKUP_DIR/ 2>/dev/null || true
        echo -e "  Backup saved to: ${GREEN}$BACKUP_DIR${NC}"
    else
        echo -e "  ${YELLOW}No data found to backup${NC}"
    fi
else
    echo ""
    echo -e "${GREEN}[1/4]${NC} Skipping backup..."
fi

echo -e "${GREEN}[2/4]${NC} Stopping PM2 process..."
pm2 stop billing 2>/dev/null || true
pm2 delete billing 2>/dev/null || true
pm2 save 2>/dev/null || true

echo -e "${GREEN}[3/4]${NC} Removing application files..."
rm -rf /opt/billing

echo -e "${GREEN}[4/4]${NC} Cleanup complete!"

echo ""
read -p "Do you also want to remove PM2 and Node.js? (y/n): " remove_deps

if [ "$remove_deps" = "y" ] || [ "$remove_deps" = "Y" ]; then
    echo ""
    echo "Removing PM2..."
    npm uninstall -g pm2 2>/dev/null || true
    rm -rf ~/.pm2
    
    echo "Removing Node.js..."
    apt remove -y nodejs 2>/dev/null || true
    rm -f /etc/apt/sources.list.d/nodesource.list
    
    echo -e "${GREEN}PM2 and Node.js removed.${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}  Uninstallation Complete!${NC}"
echo "=============================================="
echo ""

if [ "$backup_choice" = "y" ] || [ "$backup_choice" = "Y" ]; then
    echo -e "Your data backup is at: ${GREEN}$BACKUP_DIR${NC}"
    echo ""
fi
