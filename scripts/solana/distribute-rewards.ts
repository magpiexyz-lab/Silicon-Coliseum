/**
 * Distribute SOL rewards for a finalized arena.
 * Reads sol_rewards from the database and calls set_reward + finalize_arena on-chain.
 *
 * Usage: npx tsx scripts/solana/distribute-rewards.ts <arena-uuid>
 *
 * Prerequisites:
 *   - Arena must be finalized in the database (cron/finalize has run)
 *   - sol_rewards records must exist (created by resolveSolBets)
 *   - Betting must be closed on-chain
 */
import "dotenv/config";
import { PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { getConnection, getAdminKeypair, sendTx, lamportsToSol } from "./utils";
import {
  createSetRewardInstruction,
  createFinalizeArenaInstruction,
} from "../../src/lib/solana/program";

async function main() {
  const arenaUuid = process.argv[2];
  if (!arenaUuid) {
    console.error(
      "Usage: npx tsx scripts/solana/distribute-rewards.ts <arena-uuid>"
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE env vars");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const connection = getConnection();
  const admin = getAdminKeypair();

  // Fetch unclaimed rewards for this arena
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, name")
    .eq("id", arenaUuid)
    .single();

  if (!arena) {
    console.error(`Arena not found: ${arenaUuid}`);
    process.exit(1);
  }

  const { data: rewards } = await supabase
    .from("sol_rewards")
    .select("*")
    .eq("arena_id", arenaUuid)
    .is("set_reward_tx", null);

  if (!rewards || rewards.length === 0) {
    console.log("No unclaimed rewards to distribute.");
    return;
  }

  console.log(`Arena: ${arena.name} (${arenaUuid})`);
  console.log(`Rewards to set: ${rewards.length}`);

  let totalRewards = 0n;

  // Set rewards one by one
  for (const reward of rewards) {
    const winnerPubkey = new PublicKey(reward.wallet_address);
    const amount = BigInt(reward.sol_amount);
    totalRewards += amount;

    console.log(
      `  Setting reward: ${winnerPubkey.toBase58().slice(0, 8)}... = ${lamportsToSol(Number(amount))} SOL (${reward.reward_type})`
    );

    const ix = await createSetRewardInstruction(
      admin.publicKey,
      arenaUuid,
      winnerPubkey,
      amount
    );

    const sig = await sendTx(connection, admin, ix);

    // Update database with tx signature
    await supabase
      .from("sol_rewards")
      .update({ set_reward_tx: sig })
      .eq("id", reward.id);

    console.log(`    Tx: ${sig}`);
  }

  // Calculate fee (5% of performer pool, which is 50% of losers)
  // Fee is already calculated in resolveSolBets, but we need to know total escrow
  const { data: escrowData } = await supabase
    .from("arena_escrows")
    .select("total_sol")
    .eq("arena_id", arenaUuid)
    .single();

  const totalEscrow = BigInt(escrowData?.total_sol || 0);
  const feeAmount = totalEscrow > totalRewards ? totalEscrow - totalRewards : 0n;

  console.log(`\nTotal rewards: ${lamportsToSol(Number(totalRewards))} SOL`);
  console.log(`Fee to treasury: ${lamportsToSol(Number(feeAmount))} SOL`);

  // Finalize arena on-chain
  console.log("Finalizing arena on-chain...");
  const finalizeIx = await createFinalizeArenaInstruction(
    admin.publicKey,
    arenaUuid,
    feeAmount
  );
  const finalizeSig = await sendTx(connection, admin, finalizeIx);
  console.log(`Finalized! Tx: ${finalizeSig}`);

  // Update escrow in database
  await supabase
    .from("arena_escrows")
    .update({
      is_finalized: true,
      finalize_tx: finalizeSig,
      fee_collected: Number(feeAmount),
      total_distributed: Number(totalRewards),
    })
    .eq("arena_id", arenaUuid);

  console.log("\nDone! Users can now claim rewards via the UI.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
