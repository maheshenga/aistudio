import { isRegistrationAllowed } from '../src/auth/auth.service';

// AUTH-03: invite allowlist gate for closed-cohort registration. Pure unit test.
const E = (o: Record<string, string | undefined>) => o as NodeJS.ProcessEnv;

describe('isRegistrationAllowed (AUTH-03)', () => {
  it('allows anyone when REGISTRATION_OPEN=true', () => {
    expect(isRegistrationAllowed('anyone@example.com', E({ REGISTRATION_OPEN: 'true' }))).toBe(true);
    expect(isRegistrationAllowed('x@y.z', E({ REGISTRATION_OPEN: 'TRUE' }))).toBe(true);
  });

  it('blocks everyone when closed with an empty allowlist', () => {
    expect(isRegistrationAllowed('a@example.com', E({}))).toBe(false);
  });

  it('matches exact emails case-insensitively', () => {
    expect(isRegistrationAllowed('Alice@Acme.com', E({ REGISTRATION_ALLOWLIST: 'alice@acme.com, bob@acme.com' }))).toBe(true);
    expect(isRegistrationAllowed('carol@acme.com', E({ REGISTRATION_ALLOWLIST: 'alice@acme.com,bob@acme.com' }))).toBe(false);
  });

  it('matches domains with a leading @', () => {
    expect(isRegistrationAllowed('newhire@acme.com', E({ REGISTRATION_ALLOWLIST: '@acme.com' }))).toBe(true);
    expect(isRegistrationAllowed('attacker@evil.com', E({ REGISTRATION_ALLOWLIST: '@acme.com' }))).toBe(false);
  });

  it('supports mixed email + domain entries', () => {
    expect(isRegistrationAllowed('vip@gmail.com', E({ REGISTRATION_ALLOWLIST: '@acme.com, vip@gmail.com' }))).toBe(true);
  });
});
