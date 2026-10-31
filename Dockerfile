# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
# `npm install`, not `npm ci`, as in the API's Dockerfile: the lock file is written by
# npm 10 locally and this image's npm 11 resolves a few optional wasm deps (@emnapi/*)
# differently, which `npm ci` rejects as out of sync. Switch to `npm ci` once the lock
# file is regenerated with npm 11.
RUN npm install --no-audit --no-fund
COPY . .
# NEXT_PUBLIC_* are inlined into the client bundle by `next build`, so they are build
# args, not runtime env: changing one means rebuilding the image. cloudbuild.yaml passes
# them in from deploy-hml.sh.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_SOCKET_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_API_SOCKET_URL=$NEXT_PUBLIC_API_SOCKET_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
# `output: "standalone"` emits server.js plus only the node_modules it traced; static
# assets are copied next to it so the same server serves them.
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
# Cloud Run injects PORT (8080); server.js reads PORT and HOSTNAME.
EXPOSE 8080
CMD ["node", "server.js"]
