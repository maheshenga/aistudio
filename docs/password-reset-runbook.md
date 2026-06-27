# Admin-assisted password reset runbook (AUTH-04R)

There is no self-service password-reset flow yet (deferred to Revenue GA,
AUTH-04). For the closed beta, an operator resets a password directly.

## Reset a user's password

1. Generate a bcrypt hash for the new temporary password (cost 10):

   ```bash
   node -e "console.log(require('bcrypt').hashSync(process.argv[1], 10))" 'NewTemp#2026'
   ```

2. Update the user row and clear any lockout:

   ```sql
   UPDATE "User"
   SET "passwordHash" = '<hash-from-step-1>',
       "failedLoginCount" = 0,
       "lockedUntil" = NULL
   WHERE email = 'user@example.com';
   ```

3. Tell the user their temporary password over a trusted channel and ask them
   to change it after login. (Self-service change/reset lands with AUTH-04.)

## Clear a lockout only (AUTH-06)

If a user is locked out (`lockedUntil` in the future) but knows their password:

```sql
UPDATE "User" SET "failedLoginCount" = 0, "lockedUntil" = NULL WHERE email = 'user@example.com';
```

Lockout threshold/duration are controlled by `AUTH_LOCKOUT_THRESHOLD`
(default 5) and `AUTH_LOCKOUT_MS` (default 900000 = 15 min).

## Revoke sessions

To force re-login (e.g. after a suspected compromise), delete the user's
refresh tokens:

```sql
DELETE FROM "RefreshToken" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'user@example.com');
```

Access tokens expire on their own (≤15 min); deleting refresh tokens prevents
new access tokens from being minted.
