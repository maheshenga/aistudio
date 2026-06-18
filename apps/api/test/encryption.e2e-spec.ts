import { EncryptionService } from '../src/common/encryption/encryption.service';

describe('EncryptionService', () => {
  const KEY = '0000000000000000000000000000000000000000000000000000000000000000';
  let svc: EncryptionService;
  beforeAll(() => { process.env.FIELD_ENCRYPTION_KEY = KEY; svc = new EncryptionService(); });

  it('round-trips plaintext', () => {
    const plain = 'sk-live-super-secret-123';
    const enc = svc.encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(enc.split(':')).toHaveLength(3);
    expect(svc.decrypt(enc)).toBe(plain);
  });

  it('detects tampering (authTag)', () => {
    const enc = svc.encrypt('hello');
    const [iv, tag, data] = enc.split(':');
    const flipped = data.slice(0, -1) + (data.slice(-1) === '0' ? '1' : '0');
    expect(() => svc.decrypt(`${iv}:${tag}:${flipped}`)).toThrow();
  });

  it('rejects bad key length in constructor', () => {
    const prev = process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEY = 'tooshort';
    expect(() => new EncryptionService()).toThrow(/64 hex/);
    process.env.FIELD_ENCRYPTION_KEY = prev;
  });
});
