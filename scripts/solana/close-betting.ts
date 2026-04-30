/**
 * Close betting for an arena (transition to trading phase).
 *
 * Usage: npx tsx scripts/solana/close-betting.ts <arena-uuid>
 */
import "dotenv/config";
import { getConnection, getAdminKeypair, sendTx } from "./utils";
import { createCloseBettingInstruction } from "../../src/lib/solana/program";

async function main() {
  const arenaUuid = process.argv[2];
  if (!arenaUuid) {
    console.error("Usage: npx tsx scripts/solana/close-betting.ts <arena-uuid>");
    process.exit(1);
  }

  const connection = getConnection();
  const admin = getAdminKeypair();

  console.log(`Closing betting for arena: ${arenaUuid}`);

  const ix = await createCloseBettingInstruction(admin.publicKey, arenaUuid);
  const sig = await sendTx(connection, admin, ix);
  console.log("Betting closed! Tx:", sig);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
