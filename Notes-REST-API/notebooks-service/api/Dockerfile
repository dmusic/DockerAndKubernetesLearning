# =============================================================================
# Multi-stage build — notebooks-service
# Stage 1 (deps): install production dependencies only
# Stage 2 (runner): copy source + node_modules, run as non-root
# =============================================================================

# ---- Stage 1: deps ----
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

RUN npm ci --omit=dev --ignore-scripts


# ---- Stage 2: runner ----
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

# Run as the built-in non-root 'node' user
USER node

# Copy only what's needed
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

EXPOSE 3000

CMD ["node", "src/server.js"]
