import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment or derive from NEXTAUTH_SECRET
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('ENCRYPTION_KEY or NEXTAUTH_SECRET must be set');
  }

  // Derive a 32-byte key from the secret
  return crypto.scryptSync(secret, 'synuson-salt', 32);
}

/**
 * Encrypt a string value
 * @param plaintext - The value to encrypt
 * @returns Base64 encoded encrypted string (iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a string value
 * @param encryptedValue - Base64 encoded encrypted string (iv:authTag:ciphertext)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue) return '';

  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask a token for display (show only first and last 4 characters)
 */
export function maskToken(token: string): string {
  if (!token || token.length < 12) return '****';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

/**
 * Check if a value is encrypted (has the expected format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => p.length > 0);
}
