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

# Frontend-only Vite dev server
pnpm dev

# Type checking
pnpm check

# Format code
pnpm format
```

### Local Full-Stack Run

`pnpm dev` only starts the Vite frontend. It does **not** run the Express API, and there is no Vite proxy configured for `/api`.

For the full local app, including admin auth and API-backed screens:

```bash
# 1) Build the frontend + server bundle
pnpm build

# 2) Run the local Express server on a non-production port
PORT=3010 AUTH_BOOTSTRAP_EMAIL=admin@sentinelintegratedgroup.com AUTH_BOOTSTRAP_PASSWORD=local-dev-password CORS_ORIGIN=http://localhost:8081 pnpm start:local
```

Or use the root helper script once your local env is set:

```bash
pnpm dev:api
```

Then open:

- Web app: `http://localhost:3010`
- Health check: `http://localhost:3010/api/health`

Notes:

- `.env.local` is gitignored and can hold your local `AUTH_BOOTSTRAP_EMAIL`, `AUTH_BOOTSTRAP_PASSWORD`, `PORT`, and `CORS_ORIGIN`.
- Local helper scripts default auth to `DB_PROVIDER=file` so simulator/dev login works even when `.env.infrastructure.local` contains private managed Postgres credentials.
- On first startup with no existing auth users, the server seeds a bootstrap admin account from `AUTH_BOOTSTRAP_EMAIL` + `AUTH_BOOTSTRAP_PASSWORD`.
- `ADMIN_PIN` remains only as a migration fallback for bootstrap seeding and should be phased out.
- `./scripts/run-local-api.sh` now loads `.env.infrastructure.local` first, then `.env.local`; explicit shell env still overrides both.
- I verified this path locally: the server booted, the bootstrap admin user seeded, and login/verify/refresh/logout all succeeded.

### Expo + iOS Simulator

Recommended one-command local iOS Simulator flow:

```bash
./scripts/run-mobile-ios-dev.sh
```

That launcher:
- starts the local SISG API if needed
- waits for `/api/health`
- opens Simulator
- forces the Expo app to use `http://localhost:<PORT>` for the simulator, which is the most deterministic dev route

If you want the split/manual flow instead:

```bash
# terminal 1
./scripts/run-local-api.sh

# terminal 2
./scripts/run-mobile-ios.sh
```

If you want the plain Expo dev server without auto-opening iOS Simulator:

```bash
./scripts/run-mobile-expo.sh
```

Defaults:

- API port: `3010`
- Bootstrap auth: set `AUTH_BOOTSTRAP_EMAIL` and `AUTH_BOOTSTRAP_PASSWORD` in shell env or `.env.local`
- Expo API port: `3010`
- Recommended iOS Simulator API host: `localhost`
- Expo API host: auto-resolved from the active Expo dev session when possible; otherwise falls back to `localhost` on iOS Simulator and `10.0.2.2` on Android emulator
- Expo cache clear: enabled by default in the helper scripts

Overrides:

```bash
PORT=4010 AUTH_BOOTSTRAP_EMAIL=admin@sentinelintegratedgroup.com AUTH_BOOTSTRAP_PASSWORD=my-password ./scripts/run-local-api.sh
PORT=4010 ./scripts/run-mobile-ios-dev.sh
API_PORT=4010 ./scripts/run-mobile-ios.sh
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:4010 ./scripts/run-mobile-expo.sh
EXPO_CLEAR_CACHE=0 ./scripts/run-mobile-ios.sh
```

Avoid pinning `apps/mobile/.env.local` to `EXPO_PUBLIC_API_BASE_URL=http://localhost:...` unless you intentionally want Simulator-only loopback behavior. On a physical device, that bypasses host auto-detection and points the app back at the phone.

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

For local-only operator login and test config, create `.env.local` (gitignored):

```bash
AUTH_BOOTSTRAP_EMAIL=admin@sentinelintegratedgroup.com
AUTH_BOOTSTRAP_PASSWORD=your-local-admin-password
PORT=3010
CORS_ORIGIN=http://localhost:8081
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
