/**
 * Convert a base58 private key to Solana CLI JSON keypair format.
 * Usage: npx tsx scripts/solana/export-keypair.ts
 */
import bs58 from "bs58";

const privateKeyBase58 = process.env.SOLANA_ADMIN_PRIVATE_KEY;
if (!privateKeyBase58) {
  console.error("Set SOLANA_ADMIN_PRIVATE_KEY in environment");
  process.exit(1);
}

const secretKey = bs58.decode(privateKeyBase58);
console.log(JSON.stringify(Array.from(secretKey)));
