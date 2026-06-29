import crypto from 'crypto';

const SECRET_KEY_BASE = process.env.SMS_ENCRYPTION_KEY || 'shop-final-sms-secret-key-2026-secure-default';
// Derive a 32-byte key using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_KEY_BASE).digest();
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a plain text string using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('[ERROR] [Crypto]: Encryption failed |', error);
    return '';
  }
}

/**
 * Decrypts an AES-256-CBC encrypted string back to plain text
 */
export function decrypt(text: string): string {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[ERROR] [Crypto]: Decryption failed |', error);
    return '';
  }
}
