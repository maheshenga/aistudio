import { PasswordService } from '../src/auth/password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();
  it('hashes and verifies', async () => {
    const hash = await svc.hash('secret123');
    expect(hash).not.toBe('secret123');
    expect(await svc.verify('secret123', hash)).toBe(true);
    expect(await svc.verify('wrong', hash)).toBe(false);
  });
});
