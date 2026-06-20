import { ethers } from 'ethers';
import { encryptWallet, decrypt } from './encryption.js';

export function generateWallet(password: string) {
  const mnemonic = ethers.Mnemonic.entropyToPhrase(ethers.randomBytes(16));
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0");
  const salt = ethers.hexlify(ethers.randomBytes(32)).slice(2);
  const { encryptedKey, encryptedMnemonic } = encryptWallet(
    wallet.privateKey, mnemonic, password, salt,
  );
  return {
    walletAddress: wallet.address,
    encryptedPrivateKey: encryptedKey,
    encryptedMnemonic,
    walletSalt: salt,
  };
}

export function exportPrivateKey(
  encryptedKey: string,
  walletSalt: string,
  password: string,
): string {
  return decrypt(encryptedKey, password, walletSalt);
}

export function exportMnemonic(
  encryptedMnemonic: string,
  walletSalt: string,
  password: string,
): string {
  return decrypt(encryptedMnemonic, password, walletSalt);
}
