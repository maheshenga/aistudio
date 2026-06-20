#!/bin/sh
# Apply any pending database migrations, then start the API.
# `migrate deploy` is the production-safe command: it only runs already-generated
# migrations and never prompts or resets the schema.
set -e

echo "[entrypoint] running prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] starting API..."
exec node dist/main.js
