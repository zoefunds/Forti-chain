import { db, pool } from './index.js';
import { users, protocols } from './schema.js';
import bcrypt from 'bcrypt';
import { ethers } from 'ethers';
import { encryptWallet } from '../services/wallet/encryption.js';
import { env } from '../config/env.js';

async function seed() {
  console.log('Seeding database...');

  const password = 'Admin1234!';
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const mnemonic = ethers.Mnemonic.entropyToPhrase(ethers.randomBytes(16));
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0");
  const salt = ethers.hexlify(ethers.randomBytes(32));
  const { encryptedKey, encryptedMnemonic } = encryptWallet(
    wallet.privateKey, mnemonic, password, salt
  );

  const [user] = await db.insert(users).values({
    email: 'demo@fortichain.io',
    passwordHash,
    walletAddress: wallet.address,
    encryptedPrivateKey: encryptedKey,
    encryptedMnemonic,
    walletSalt: salt,
    emailVerified: true,
    subscriptionTier: 'pro',
  }).returning();

  await db.insert(protocols).values([
    {
      userId: user.id,
      name: 'Aave V3',
      chain: 'ethereum',
      contractAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      category: 'lending',
      websiteUrl: 'https://aave.com',
      monitoringActive: true,
      riskScore: 12,
    },
    {
      userId: user.id,
      name: 'Uniswap V3',
      chain: 'ethereum',
      contractAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      category: 'dex',
      websiteUrl: 'https://uniswap.org',
      monitoringActive: true,
      riskScore: 8,
    },
    {
      userId: user.id,
      name: 'Compound III',
      chain: 'ethereum',
      contractAddress: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
      category: 'lending',
      websiteUrl: 'https://compound.finance',
      monitoringActive: true,
      riskScore: 35,
    },
  ]);

  console.log('Seed complete. Demo user: demo@fortichain.io / Admin1234!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
