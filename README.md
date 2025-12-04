# Deployment Guide

This guide explains how to deploy the User Management application on a server (e.g., Ubuntu, Debian, or Windows Server).

## Prerequisites

1.  **Node.js**: Install Node.js (version 18 or higher).
    *   Ubuntu/Debian:
        ```bash
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        ```
2.  **Git**: Install Git to clone the repository (optional, if you are uploading files directly).
3.  **PM2**: Install PM2 for process management (to keep the app running).
    ```bash
    npm install -g pm2
    ```

## Installation Steps

1.  **Copy Files**: Upload the project files to your server.
2.  **Install Dependencies**:
    Navigate to the project directory and run:
    ```bash
    npm install
    ```
3.  **Build the Application**:
    Build the Next.js application for production:
    ```bash
    npm run build
    ```
4.  **Start the Application**:
    Start the app using PM2:
    ```bash
    pm2 start npm --name "billing-app" -- start
    ```
5.  **Save PM2 List**:
    Ensure the app starts on boot:
    ```bash
    pm2 save
    pm2 startup
    ```

## Configuration

*   **Port**: By default, the app runs on port 3000. You can change this by modifying the start script or passing a port argument.
*   **Reverse Proxy (Nginx)**: It is recommended to use Nginx as a reverse proxy to serve the app on port 80/443.

    Example Nginx Config:
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
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

## Resetting Data

If you need to reset the data to a clean state (keeping only the admin user), you can run:
```bash
node scripts/reset-data.js
```

## Scheduler & Timezone

The application now includes a background scheduler (using `node-cron`) for:
1.  **Daily Backups**: Runs at 00:00 (Midnight).
2.  **Auto-Drop Unpaid Users**: Runs at 01:00 AM.

**Important**: Ensure your server's timezone is set correctly (e.g., to Asia/Jakarta) so that these tasks run at the expected local time.

Check server time:
```bash
date
```

Set timezone (Ubuntu):
```bash
sudo timedatectl set-timezone Asia/Jakarta
```


Username & Password Default
```bash
username   : admin
password   : admin
```
