# Secret rotation & per-environment secrets (AUTH-01)

The API refuses to boot unless `JWT_SECRET` and `FIELD_ENCRYPTION_KEY` pass a
strength check (`apps/api/src/common/config/secret-validation.ts`):

- `JWT_SECRET` — not a known placeholder, ≥32 chars, ≥8 distinct characters.
- `FIELD_ENCRYPTION_KEY` — exactly 64 hex chars (32 bytes), not all zeros.

## Generating secrets

```bash
# JWT signing secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or
openssl rand -hex 32

# Field encryption key (AES-256-GCM, 32 bytes)
openssl rand -hex 32
```

## Per-environment injection

Never commit real secrets. `apps/api/.env` is gitignored and holds **local-dev
only** values. For staging/production, inject secrets via the deploy platform's
secret store and pass them through `docker-compose.yml` (`JWT_SECRET`,
`FIELD_ENCRYPTION_KEY` are already required there) — do **not** check out a
populated `.env.deploy`.

## Rotation procedures

### JWT_SECRET
Rotating `JWT_SECRET` invalidates all currently-signed access tokens (≤15 min
TTL by default) and breaks refresh-token verification if refresh tokens are
signed with it. Procedure:

1. Roll out the new secret to all API replicas.
2. Existing access tokens fail verification → clients silently re-auth via
   `/auth/refresh` (if refresh tokens are stored server-side and not
   secret-signed) or are forced to log in again.
3. Tolerate a short overlap window by briefly accepting both old and new
   secrets if you implement multi-key verification; otherwise schedule rotation
   during a low-traffic window and accept a one-time re-login.

### FIELD_ENCRYPTION_KEY
This key encrypts stored secrets (e.g. provider credentials). Rotating it
requires **versioned re-encryption** — you cannot simply swap it:

1. Add the new key as a second active key (keyed by version prefix).
2. Decrypt-with-old / re-encrypt-with-new every stored ciphertext in a
   migration job.
3. Once all rows are re-encrypted, retire the old key.

Until a versioned-key scheme is implemented, treat `FIELD_ENCRYPTION_KEY` as
immutable for the life of the data; losing it makes encrypted fields
unrecoverable.
