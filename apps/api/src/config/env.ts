import { config } from 'dotenv';
config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  BCRYPT_ROUNDS: parseInt(optional('BCRYPT_ROUNDS', '12')),
  WALLET_ENCRYPTION_SECRET: required('WALLET_ENCRYPTION_SECRET'),
  GENLAYER_RPC_URL: optional('GENLAYER_RPC_URL', 'https://studio.genlayer.com/api'),
  GENLAYER_CONTRACT_ADDRESS: optional('GENLAYER_CONTRACT_ADDRESS', ''),
  GENLAYER_PRIVATE_KEY: optional('GENLAYER_PRIVATE_KEY', ''),
  TREASURY_WALLET: optional('TREASURY_WALLET', ''),
  BREVO_API_KEY: optional('BREVO_API_KEY', ''),
  EMAIL_FROM: optional('EMAIL_FROM', 'alerts@fortichain.io'),
  ETHERSCAN_API_KEY: optional('ETHERSCAN_API_KEY', ''),
  ALCHEMY_API_KEY: optional('ALCHEMY_API_KEY', ''),
  FORTA_API_KEY: optional('FORTA_API_KEY', ''),
  COINGECKO_API_KEY: optional('COINGECKO_API_KEY', ''),
  TWITTER_BEARER_TOKEN: optional('TWITTER_BEARER_TOKEN', ''),
  PORT: parseInt(optional('PORT', '3001')),
  NODE_ENV: optional('NODE_ENV', 'development'),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:3000'),
} as const;
