/**
 * Initialize the Silicon Coliseum Solana program.
 * Run once after deploying the Anchor program.
 *
 * Usage: npx tsx scripts/solana/initialize.ts
 *
 * Env vars:
 *   SOLANA_ADMIN_PRIVATE_KEY - base58 encoded admin keypair
 *   NEXT_PUBLIC_SOLANA_PROGRAM_ID - deployed program ID
 *   NEXT_PUBLIC_TREASURY_WALLET - treasury wallet pubkey
 */
import "dotenv/config";
import { PublicKey } from "@solana/web3.js";
import { getConnection, getAdminKeypair, sendTx } from "./utils";
import { createInitializeInstruction } from "../../src/lib/solana/program";

async function main() {
  const connection = getConnection();
  const admin = getAdminKeypair();
  const treasuryPubkey = new PublicKey(
    process.env.NEXT_PUBLIC_TREASURY_WALLET || admin.publicKey.toBase58()
  );

  console.log("Admin:", admin.publicKey.toBase58());
  console.log("Treasury:", treasuryPubkey.toBase58());

  // 1 SOL = 10,000 CP → 100,000 lamports per CP
  const cpRateLamports = 100_000n;
  // Min bet: 0.01 SOL = 10,000,000 lamports
  const minBetLamports = 10_000_000n;
  // Fee: 5% = 500 bps
  const feeBps = 500;

  console.log(`CP Rate: ${cpRateLamports} lamports/CP`);
  console.log(`Min Bet: ${minBetLamports} lamports (0.01 SOL)`);
  console.log(`Fee: ${feeBps} bps (5%)`);

  const ix = await createInitializeInstruction(
    admin.publicKey,
    treasuryPubkey,
    cpRateLamports,
    minBetLamports,
    feeBps
  );

  console.log("Sending initialize transaction...");
  const sig = await sendTx(connection, admin, ix);
  console.log("Initialized! Tx:", sig);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
