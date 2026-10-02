import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Standard AES-256-GCM combined representation, shared with Apple CryptoKit:
// 12-byte nonce | ciphertext | 16-byte authentication tag. No secrets in routing headers.
export function seal(key, value, aad) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), nonce);
  cipher.setAAD(Buffer.from(aad));
  return Buffer.concat([nonce, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]).toString('base64');
}
export function unseal(key, combined, aad) {
  if (typeof combined !== 'string' || combined.length > 8_000_000) throw new Error('Invalid encrypted message.');
  const bytes = Buffer.from(combined, 'base64');
  if (bytes.length < 28) throw new Error('Invalid encrypted message.');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(bytes.subarray(-16));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString());
}
export const secret = () => randomBytes(32).toString('hex');
