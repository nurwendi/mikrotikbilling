# Deployment Guide - PPPoE Billing Management System

This guide explains how to deploy the PPPoE Billing Management application on Ubuntu/Debian Server.

## System Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+
- **Node.js**: 20.x or higher
- **RAM**: Minimum 1GB
- **Storage**: Minimum 10GB
- **Network**: Access to MikroTik Router via API

## Quick Installation (Ubuntu/Debian)

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # Verify installation
```

### 3. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 4. Install Git
```bash
sudo apt install -y git
```

### 5. Clone Repository
```bash
cd /opt
sudo git clone https://github.com/nurwendi/pppoemanagement.git billing
sudo chown -R $USER:$USER /opt/billing
cd /opt/billing
```

### 6. Install Dependencies
```bash
npm install
```

### 7. Build Application
```bash
npm run build
```

### 8. Start Application with PM2
```bash
pm2 start npm --name "billing" -- start
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

### 9. Set Timezone
```bash
sudo timedatectl set-timezone Asia/Jakarta
```

## Configuration

### Default Login
- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **Important**: Change the default password after first login!

### Port Configuration
The app runs on port **3000** by default. To run on port 80:

**Option A: Use authbind (Recommended)**
```bash
sudo apt install authbind
sudo touch /etc/authbind/byport/80
sudo chmod 500 /etc/authbind/byport/80
sudo chown $USER /etc/authbind/byport/80
```

**Option B: Use Nginx as Reverse Proxy**
```bash
sudo apt install nginx
```

Create config file:
```bash
sudo nano /etc/nginx/sites-available/billing
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/billing /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## MikroTik Router Setup

### Enable API Access
On MikroTik RouterOS:
```
/ip service set api address=YOUR_SERVER_IP enabled=yes port=8728
```

### Create API User
```
/user add name=billing password=YOUR_PASSWORD group=full
```

## Data Files Location

| File | Description |
|------|-------------|
| `config.json` | Router connections and settings |
| `app-settings.json` | Application name and logo |
| `billing-settings.json` | Invoice settings |
| `customer-data.json` | Customer information |
| `data/users.json` | System users |
| `data/traffic-history.json` | Traffic history (7 days) |
| `data/temperature-history.json` | Temperature history (3 days) |
| `data/cpu-history.json` | CPU usage history (3 days) |
| `backups/` | Automatic backups |

## Scheduled Tasks

The application runs automatic tasks:

| Task | Schedule | Description |
|------|----------|-------------|
| Daily Backup | 00:00 | Backs up all data to `backups/` folder |
| Auto-Drop | 01:00 | Disconnects users with overdue payments |
| Traffic Collection | Every minute | Collects bandwidth data |
| Usage Sync | Every 5 minutes | Syncs user data usage |

## PM2 Commands

```bash
pm2 list              # Show all processes
pm2 logs billing      # View logs
pm2 restart billing   # Restart application
pm2 stop billing      # Stop application
pm2 delete billing    # Remove from PM2
```

## Update Application

```bash
cd /opt/billing
git pull origin main
npm install
npm run build
pm2 restart billing
```

## Resetting Data

To reset all data to fresh state:
```bash
node scripts/reset-data.js
```

This will:
- Clear all customer data
- Reset to default admin user
- Clear all history data
- Keep configuration files

## Troubleshooting

### Port 3000 Already in Use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### PM2 Not Starting on Boot
```bash
pm2 unstartup
pm2 startup
pm2 save
```

### Check Application Logs
```bash
pm2 logs billing --lines 100
```

### Verify Node.js Version
```bash
node -v  # Should be 20.x or higher
```

## Features

- ✅ Dashboard with real-time stats
- ✅ PPPoE User Management
- ✅ Billing & Invoice System
- ✅ Customer Data Management
- ✅ Multi-Router Support
- ✅ Temperature & CPU Monitoring (3-day graphs)
- ✅ Traffic Monitoring (7-day graphs)
- ✅ Auto-Drop Unpaid Users
- ✅ Automatic Backups
- ✅ Dark Mode Support
- ✅ Mobile Responsive

## Support

For issues and feature requests, please open an issue on GitHub:
https://github.com/nurwendi/pppoemanagement/issues
