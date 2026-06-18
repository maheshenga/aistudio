import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.FIELD_ENCRYPTION_KEY ?? '';
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new Error('FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes).');
    }
    this.key = Buffer.from(raw, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format.');
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = createDecipheriv(ALGO, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  }
}
