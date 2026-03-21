# SISG Platform

Sentinel Integrated Solutions Group (SISG) — a veteran-owned IT consulting and cybersecurity firm delivering mission-critical technology solutions.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui + Radix UI
- **Backend**: Express.js + Node.js
- **Package Manager**: pnpm
- **Deployment**: Docker + DigitalOcean

## Development

### Prerequisites

- Node.js 20+
- pnpm 10.15+

### Setup

```bash
# Install dependencies
pnpm install

# Start development server (Vite on localhost:3000)
pnpm dev

# Type checking
pnpm check

# Format code
pnpm format
```

## Building

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview

# Start production server
pnpm start
```

## Docker Deployment

### Local Testing

```bash
# Build and run with docker-compose
docker-compose up --build

# Access at http://localhost:3000
```

### Environment Configuration

Copy `.env.example` to `.env.production` and configure:

```bash
cp .env.example .env.production
# Edit .env.production with production values
```

## GitHub Actions Deployment

### Setup GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub access token
- `DROPLET_HOST`: DigitalOcean Droplet IP address
- `DROPLET_USER`: SSH username (usually `root`)
- `DROPLET_SSH_KEY`: SSH private key for the droplet

### Deployment Trigger

Push to `main` branch to automatically:
1. Build Docker image
2. Push to Docker Hub
3. Deploy to DigitalOcean Droplet
4. Restart application

```bash
git push origin main
```

## Deployment Architecture

```
GitHub (main branch)
    ↓
GitHub Actions
    ├─ Build Docker image
    └─ Push to Docker Hub
    ↓
DigitalOcean Droplet
    ├─ Pull latest image
    ├─ Stop old container
    └─ Start new container
    ↓
Nginx Reverse Proxy
    ├─ Port 80 → 443 (HTTPS redirect)
    └─ Port 443 → http://localhost:3000
    ↓
sentinelintegratedgroup.com
```

## Production Server Setup (One-time)

### 1. SSH into Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 2. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-v2 -y

# Install git
apt install git -y

# Install nginx
apt install nginx -y
```

### 3. Clone Repository

```bash
mkdir -p /app
cd /app
git clone https://github.com/YOUR_USERNAME/sisg-platform.git
cd sisg-platform
```

### 4. Setup SSL Certificate

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Generate certificate
certbot certonly --standalone -d sentinelintegratedgroup.com -d www.sentinelintegratedgroup.com
```

### 5. Configure Nginx

Create `/etc/nginx/sites-available/sisg-platform`:

```nginx
server {
    listen 80;
    server_name sentinelintegratedgroup.com www.sentinelintegratedgroup.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sentinelintegratedgroup.com www.sentinelintegratedgroup.com;

    ssl_certificate /etc/letsencrypt/live/sentinelintegratedgroup.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sentinelintegratedgroup.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/sisg-platform /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 6. Create .env.production

```bash
cd /app/sisg-platform
cp .env.example .env.production
# Edit with production values
nano .env.production
```

### 7. Initial Deployment

```bash
docker-compose up -d
```

## Monitoring

Check application status:

```bash
# View logs
docker-compose logs -f

# Check container health
docker-compose ps

# Restart if needed
docker-compose restart
```

## Common Tasks

### Update Application

```bash
# Pull latest code
git pull origin main

# Restart container (automatically triggers via GitHub Actions)
docker-compose restart
```

### View Logs

```bash
docker-compose logs -f app
```

### Database Migrations (if applicable)

```bash
docker-compose exec app npm run migrate
```

## Support

For issues and questions:
- GitHub: [SISG Platform Repository]
- Email: info@sentinelintegratedgroup.com
# sisg-platform
