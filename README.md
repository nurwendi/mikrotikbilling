# MikroTik Billing Management System

A comprehensive PPPoE billing and user management system for MikroTik routers.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)

## ✨ Features

- ✅ Dashboard with real-time stats
- ✅ PPPoE User Management
- ✅ Billing & Invoice System (Auto-Generated)
- ✅ **Auto Email Payment Receipt (PDF)** 🆕
- ✅ Customer Data Management
- ✅ Multi-Router Support
- ✅ Temperature & CPU Monitoring (3-day graphs)
- ✅ Traffic Monitoring (7-day graphs)
- ✅ Auto-Drop Unpaid Users
- ✅ Automatic Backups
- ✅ Dark Mode Support
- ✅ **Mobile Optimized UI** (Bottom Nav, Dynamic Transitions) 🆕
- ✅ **App Settings Access & Role-Based Visibility** 🆕

## 📋 System Requirements

| Requirement | Minimum |
|-------------|---------|
| OS | Ubuntu 20.04+ / Debian 11+ |
| Node.js | 20.x or higher |
| RAM | 1GB |
| Storage | 10GB |
| Network | Access to MikroTik Router via API |

---

## 🚀 Installation

### Quick Install (One Command)

```bash
cd /root
curl -fsSL https://raw.githubusercontent.com/nurwendi/mikrotikbilling/main/scripts/install.sh | bash
```

### Quick Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/nurwendi/mikrotikbilling/main/scripts/uninstall.sh | bash
```

### Manual Installation

#### Step 1: Update System
```bash
# If logged in as root (no sudo needed)
apt update && apt upgrade -y
apt install -y curl git

# If logged in as regular user
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git
```

#### Step 2: Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v  # Verify: should show v20.x
```

#### Step 3: Install PM2 (Process Manager)
```bash
npm install -g pm2
```

#### Step 4: Clone Repository
```bash
cd /opt
git clone https://github.com/nurwendi/mikrotikbilling.git billing
cd /opt/billing
```

#### Step 5: Install Dependencies & Build
```bash
npm install
npm run build
```

#### Step 6: Start Application
```bash
pm2 start npm --name "billing" -- start
pm2 save
pm2 startup  # Follow the printed command to enable auto-start
```

#### Step 7: Set Timezone (Optional)
```bash
timedatectl set-timezone Asia/Jakarta
```

#### Step 8: Access Application
Open browser: `http://YOUR_SERVER_IP:3000`

**Default Login:**
- Username: `admin`
- Password: `admin`

> ⚠️ **Important**: Change the default password after first login!

---

## 🗑️ Uninstallation

### Complete Removal

```bash
# Stop and remove from PM2
pm2 stop billing
pm2 delete billing
pm2 save

# Remove application files
rm -rf /opt/billing

# Remove PM2 startup script (optional)
pm2 unstartup
```

### Remove with Data Backup

```bash
# Backup data first
mkdir -p ~/billing-backup
cp /opt/billing/config.json ~/billing-backup/
cp /opt/billing/customer-data.json ~/billing-backup/
cp -r /opt/billing/data ~/billing-backup/
cp -r /opt/billing/backups ~/billing-backup/

# Then uninstall
pm2 stop billing
pm2 delete billing
pm2 save
rm -rf /opt/billing

echo "Backup saved to ~/billing-backup"
```

### Remove Everything (including Node.js & PM2)

```bash
# Remove application
pm2 stop billing
pm2 delete billing
rm -rf /opt/billing

# Remove PM2
npm uninstall -g pm2
rm -rf ~/.pm2

# Remove Node.js (optional)
apt remove -y nodejs
rm -rf /etc/apt/sources.list.d/nodesource.list
```

---

## ⚙️ Configuration

### MikroTik Router Setup

Enable API access on your MikroTik router:
```
/ip service set api address=YOUR_SERVER_IP enabled=yes port=8728
/user add name=billing password=YOUR_PASSWORD group=full
```

### Nginx Reverse Proxy (Optional - for port 80)

```bash
apt install nginx -y
nano /etc/nginx/sites-available/billing
```

Add configuration:
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
ln -s /etc/nginx/sites-available/billing /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 📁 Data Files

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

---

## ⏰ Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Daily Backup | 00:00 | Backs up all data to `backups/` folder |
| Auto-Drop | 01:00 | Disconnects users with overdue payments |
| Auto-Invoice | 1st of Month 07:00 | Generates invoices for all customers |
| Traffic Collection | Every minute | Collects bandwidth data |
| Usage Sync | Every 5 minutes | Syncs user data usage |

---

## 🔧 PM2 Commands

```bash
pm2 list              # Show all processes
pm2 logs billing      # View logs
pm2 restart billing   # Restart application
pm2 stop billing      # Stop application
pm2 delete billing    # Remove from PM2
```

---

## 🔄 Update Application

```bash
cd /opt/billing
git pull origin main
npm install
npm run build
pm2 restart billing
```

---

## 🔁 Reset Data

To reset all data to fresh state:
```bash
cd /opt/billing
node scripts/reset-data.js
```

This will:
- Clear all customer data
- Reset to default admin user (admin/admin)
- Clear all history data
- Keep configuration files

---

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
lsof -i :3000
kill -9 <PID>
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

### Login Not Working
Make sure you're using HTTP (not HTTPS) or the cookie won't be saved.

### Cannot Connect to MikroTik
1. Verify API is enabled: `/ip service print`
2. Check firewall rules on MikroTik
3. Verify credentials in Connection settings

---

## 📞 Support

For issues and feature requests, please open an issue on GitHub:
https://github.com/nurwendi/mikrotikbilling/issues

---

## 📄 License

MIT License - feel free to use and modify for your needs.
