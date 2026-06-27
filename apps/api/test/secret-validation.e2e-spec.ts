import { assertSecretStrength } from '../src/common/config/secret-validation';

// AUTH-01: the boot guard must reject missing / placeholder / low-entropy
// secrets and accept a real per-env secret. Pure unit test — no DB/app needed.
const GOOD_JWT = 'b473b967b2930440f6b7fdad6783a957d4be86886e3211d0c2331d4465ec8922';
const GOOD_FEK = '1a7716c7ecc8437171ceef710376342969420f58c4633623b39c39db011e1acb';

describe('assertSecretStrength (AUTH-01)', () => {
  it('throws when JWT_SECRET is missing', () => {
    expect(() => assertSecretStrength({ FIELD_ENCRYPTION_KEY: GOOD_FEK } as NodeJS.ProcessEnv)).toThrow(/JWT_SECRET is required/);
  });

  it('rejects the known placeholder JWT_SECRET', () => {
    expect(() => assertSecretStrength({ JWT_SECRET: 'dev-only-change-me-in-production', FIELD_ENCRYPTION_KEY: GOOD_FEK } as NodeJS.ProcessEnv))
      .toThrow(/known placeholder/);
  });

  it('rejects a too-short JWT_SECRET', () => {
    expect(() => assertSecretStrength({ JWT_SECRET: 'short', FIELD_ENCRYPTION_KEY: GOOD_FEK } as NodeJS.ProcessEnv)).toThrow(/at least 32/);
  });

  it('rejects a low-entropy JWT_SECRET', () => {
    expect(() => assertSecretStrength({ JWT_SECRET: 'a'.repeat(40), FIELD_ENCRYPTION_KEY: GOOD_FEK } as NodeJS.ProcessEnv)).toThrow(/too little entropy/);
  });

  it('rejects an all-zero FIELD_ENCRYPTION_KEY', () => {
    expect(() => assertSecretStrength({ JWT_SECRET: GOOD_JWT, FIELD_ENCRYPTION_KEY: '0'.repeat(64) } as NodeJS.ProcessEnv)).toThrow(/all zeros/);
  });

  it('rejects a non-hex FIELD_ENCRYPTION_KEY', () => {
    expect(() => assertSecretStrength({ JWT_SECRET: GOOD_JWT, FIELD_ENCRYPTION_KEY: 'not-hex' } as NodeJS.ProcessEnv)).toThrow(/64 hex chars/);
  });

  it('accepts real per-env secrets', () => {
    expect(() => assertSecretStrength({ JWT_SECRET: GOOD_JWT, FIELD_ENCRYPTION_KEY: GOOD_FEK } as NodeJS.ProcessEnv)).not.toThrow();
  });

  it('accepts the CI-style secret', () => {
    expect(() => assertSecretStrength({ JWT_SECRET: 'ci-only-jwt-secret-not-for-production', FIELD_ENCRYPTION_KEY: GOOD_FEK } as NodeJS.ProcessEnv)).not.toThrow();
  });
});
