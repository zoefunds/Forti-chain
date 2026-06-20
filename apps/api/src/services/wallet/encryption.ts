import crypto from 'crypto';
import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const PBKDF2_ITER = 100_000;
const PBKDF2_DIGEST = 'sha256';

function deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(
    password + env.WALLET_ENCRYPTION_SECRET,
    Buffer.from(salt, 'hex'),
    PBKDF2_ITER,
    KEY_LEN,
    PBKDF2_DIGEST,
  );
}

function encrypt(plaintext: string, password: string, salt: string): string {
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decrypt(ciphertext: string, password: string, salt: string): string {
  const key = deriveKey(password, salt);
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

// Server-side key: derived from WALLET_ENCRYPTION_SECRET + userId only.
// Allows the API to decrypt the user's private key without their password.
function deriveServerKey(userId: string): Buffer {
  return crypto.pbkdf2Sync(
    env.WALLET_ENCRYPTION_SECRET,
    Buffer.from(userId),
    100_000,
    KEY_LEN,
    PBKDF2_DIGEST,
  );
}

export function encryptForServer(plaintext: string, userId: string): string {
  const key = deriveServerKey(userId);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptForServer(ciphertext: string, userId: string): string {
  const key = deriveServerKey(userId);
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

export function encryptWallet(
  privateKey: string,
  mnemonic: string,
  password: string,
  salt: string,
) {
  return {
    encryptedKey: encrypt(privateKey, password, salt),
    encryptedMnemonic: encrypt(mnemonic, password, salt),
  };
}
