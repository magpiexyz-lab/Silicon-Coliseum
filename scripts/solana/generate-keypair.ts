/**
 * Generate a Solana keypair for use as admin/treasury.
 * Outputs the public key and base58-encoded private key.
 *
 * Usage: npx tsx scripts/solana/generate-keypair.ts
 */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const keypair = Keypair.generate();

console.log("=== New Solana Keypair ===");
console.log(`Public Key:  ${keypair.publicKey.toBase58()}`);
console.log(`Private Key: ${bs58.encode(keypair.secretKey)}`);
console.log("");
console.log("Add to .env.local:");
console.log(`SOLANA_ADMIN_PRIVATE_KEY=${bs58.encode(keypair.secretKey)}`);
console.log(`NEXT_PUBLIC_TREASURY_WALLET=${keypair.publicKey.toBase58()}`);
console.log("");
console.log("Fund on testnet:");
console.log(`  https://faucet.solana.com/ (paste ${keypair.publicKey.toBase58()})`);
