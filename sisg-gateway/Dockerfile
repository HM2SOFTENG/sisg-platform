# ============================================================================
# SISG Gateway — Docker Build
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./

# Data directory for file persistence
RUN mkdir -p /app/data

EXPOSE 4100

CMD ["node", "dist/index.js"]
