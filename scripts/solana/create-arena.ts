/**
 * Create an on-chain arena escrow for SOL bets.
 * Run this when creating an arena that accepts SOL bets.
 *
 * Usage: npx tsx scripts/solana/create-arena.ts <arena-uuid>
 */
import "dotenv/config";
import { getConnection, getAdminKeypair, sendTx } from "./utils";
import { createArenaEscrowInstruction } from "../../src/lib/solana/program";
import { getArenaEscrowPDA } from "../../src/lib/solana/utils";

async function main() {
  const arenaUuid = process.argv[2];
  if (!arenaUuid) {
    console.error("Usage: npx tsx scripts/solana/create-arena.ts <arena-uuid>");
    process.exit(1);
  }

  const connection = getConnection();
  const admin = getAdminKeypair();

  const [escrowPDA] = getArenaEscrowPDA(arenaUuid);
  console.log(`Arena UUID: ${arenaUuid}`);
  console.log(`Escrow PDA: ${escrowPDA.toBase58()}`);

  const ix = await createArenaEscrowInstruction(admin.publicKey, arenaUuid);

  console.log("Creating arena escrow...");
  const sig = await sendTx(connection, admin, ix);
  console.log("Created! Tx:", sig);
  console.log(`Escrow address: ${escrowPDA.toBase58()}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
