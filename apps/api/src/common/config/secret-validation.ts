/**
 * AUTH-01: fail-fast validation of security-critical secrets at process boot.
 *
 * The repo historically shipped placeholder secrets (JWT_SECRET="dev-only-change-me-in-production",
 * an all-zero FIELD_ENCRYPTION_KEY). If those reach a deployment, every access/refresh token is
 * forgeable and every encrypted field is readable. This guard refuses to start the process when a
 * known-bad or low-entropy secret is configured, so a misconfigured deploy fails loudly instead of
 * silently running insecure.
 */

const KNOWN_PLACEHOLDERS = [
  'dev-only-change-me-in-production',
  'change-me',
  'changeme',
  'secret',
  'please-change-me',
];

/** Distinct-character count — a cheap proxy for entropy that catches "aaaa…" / all-zero keys. */
function distinctChars(value: string): number {
  return new Set(value).size;
}

export function assertSecretStrength(env: NodeJS.ProcessEnv = process.env): void {
  const jwt = env.JWT_SECRET;
  if (!jwt) {
    throw new Error('JWT_SECRET is required but not set. Refusing to start.');
  }
  if (KNOWN_PLACEHOLDERS.includes(jwt.trim().toLowerCase())) {
    throw new Error(
      'JWT_SECRET is set to a known placeholder value. Generate a real secret ' +
        '(e.g. `openssl rand -hex 32`) and inject it via your deploy secret store. Refusing to start.',
    );
  }
  if (jwt.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters. Refusing to start.');
  }
  if (distinctChars(jwt) < 8) {
    throw new Error('JWT_SECRET has too little entropy (fewer than 8 distinct characters). Refusing to start.');
  }

  const fieldKey = env.FIELD_ENCRYPTION_KEY;
  if (!fieldKey) {
    throw new Error('FIELD_ENCRYPTION_KEY is required but not set. Refusing to start.');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(fieldKey)) {
    throw new Error('FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Refusing to start.');
  }
  if (/^0+$/.test(fieldKey)) {
    throw new Error('FIELD_ENCRYPTION_KEY is all zeros (placeholder). Generate a real key. Refusing to start.');
  }
}
