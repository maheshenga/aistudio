# ── Stage 1: build ─────────────────────────────────────────────
# Full dependencies + Prisma client generation + Nest build.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# OpenSSL is required by Prisma engines at generate/runtime.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies against the lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci

# Generate the Prisma client (needs schema before the rest of the source).
COPY prisma ./prisma
RUN npx prisma generate

# Compile the NestJS application to dist/.
COPY . .
RUN npm run build

# Drop dev dependencies so they can be copied into the runtime image.
RUN npm prune --omit=dev

# ── Stage 2: runtime ───────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Production artifacts only.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Run as the unprivileged node user shipped with the base image.
USER node

EXPOSE 4000

# Applies pending migrations, then boots the API.
ENTRYPOINT ["./docker-entrypoint.sh"]
