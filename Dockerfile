# ── Stage 1: build ─────────────────────────────────────────────
# Vite bakes VITE_* env vars at build time, so the data-backend wiring must be
# supplied as build args (not runtime env).
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Default to the HTTP backend talking to the bundled API service. Override at
# build time with --build-arg for other deployments.
ARG VITE_DATA_BACKEND=http
ARG VITE_DATA_API_URL=http://localhost:4000
ENV VITE_DATA_BACKEND=$VITE_DATA_BACKEND
ENV VITE_DATA_API_URL=$VITE_DATA_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: runtime ───────────────────────────────────────────
# Serve the static bundle with nginx, including SPA history fallback.
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
