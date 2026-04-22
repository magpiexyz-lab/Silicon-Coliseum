import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Betting System -- spectators bet CP on which agents will finish top 3.
 * Losing pool splits 50/50 between agent owners and winning bettors.
 */

/**
 * Place a bet on an agent to finish in the top 3.
 * Validates: user is a spectator (no agent in this arena), has enough CP.
 * Deducts CP and creates bet record.
 */
export async function placeBet(
  supabase: SupabaseClient,
  arenaId: string,
  userId: string,
  agentId: string,
  cpAmount: number
): Promise<void> {
  if (cpAmount <= 0) {
    throw new Error("Bet amount must be positive");
  }

  // Check user is not a participant (spectator only)
  const { data: existingAgent } = await supabase
    .from("agents")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingAgent) {
    throw new Error("Participants cannot bet on their own arena");
  }

  // Check user has enough CP
  const { data: user } = await supabase
    .from("users")
    .select("cp_balance")
    .eq("id", userId)
    .single();

  if (!user || user.cp_balance < cpAmount) {
    throw new Error("Insufficient Coliseum Points");
  }

  // Deduct CP
  const { error: deductError } = await supabase
    .from("users")
    .update({ cp_balance: user.cp_balance - cpAmount })
    .eq("id", userId);

  if (deductError) {
    throw new Error(`Failed to deduct CP: ${deductError.message}`);
  }

  // Create bet record
  const { error: betError } = await supabase.from("bets").insert({
    arena_id: arenaId,
    user_id: userId,
    agent_id: agentId,
    cp_amount: cpAmount,
    status: "pending",
    payout: 0,
  });

  if (betError) {
    // Refund CP on failure
    await supabase
      .from("users")
      .update({ cp_balance: user.cp_balance })
      .eq("id", userId);
    throw new Error(`Failed to place bet: ${betError.message}`);
  }

  // Record CP transaction
  await supabase.from("cp_transactions").insert({
    user_id: userId,
    amount: -cpAmount,
    type: "spend",
    source: "bet_placed",
    arena_id: arenaId,
  });
}

/**
 * Resolve all bets for a completed arena.
 * Top 3 agent IDs are winners. Bets on top-3 agents win.
 *
 * Losing pool (total CP from losing bets) splits:
 *   50% -> agent owners (top 10, weighted by rank)
 *   50% -> winning bettors (proportional to bet size)
 *
 * Winning bettors get their original bet back + share of 50% losing pool.
 */
export async function resolveBets(
  supabase: SupabaseClient,
  arenaId: string,
  topAgentIds: string[]
): Promise<void> {
  const top3Ids = new Set(topAgentIds.slice(0, 3));

  // Fetch all pending bets for this arena
  const { data: bets, error: betsError } = await supabase
    .from("bets")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("status", "pending");

  if (betsError || !bets || bets.length === 0) return;

  // Separate winning and losing bets
  const winningBets = bets.filter((b) => top3Ids.has(b.agent_id));
  const losingBets = bets.filter((b) => !top3Ids.has(b.agent_id));

  const losingPool = losingBets.reduce((sum, b) => sum + b.cp_amount, 0);
  const bettorShare = losingPool * 0.5;
  const ownerShare = losingPool * 0.5;

  // --- Pay winning bettors ---
  const totalWinningBetAmount = winningBets.reduce((sum, b) => sum + b.cp_amount, 0);

  for (const bet of winningBets) {
    // Proportional share of bettor pool
    const proportion =
      totalWinningBetAmount > 0 ? bet.cp_amount / totalWinningBetAmount : 0;
    const winnings = bettorShare * proportion;
    const payout = bet.cp_amount + winnings; // Original bet + winnings

    // Update bet status
    await supabase
      .from("bets")
      .update({ status: "won", payout })
      .eq("id", bet.id);

    // Credit user CP
    const { data: user } = await supabase
      .from("users")
      .select("cp_balance")
      .eq("id", bet.user_id)
      .single();

    if (user) {
      await supabase
        .from("users")
        .update({ cp_balance: user.cp_balance + payout })
        .eq("id", bet.user_id);

      await supabase.from("cp_transactions").insert({
        user_id: bet.user_id,
        amount: payout,
        type: "payout",
        source: "bet_payout",
        arena_id: arenaId,
      });
    }
  }

  // --- Mark losing bets ---
  for (const bet of losingBets) {
    await supabase
      .from("bets")
      .update({ status: "lost", payout: 0 })
      .eq("id", bet.id);
  }

  // --- Distribute owner share to top 10 agent owners ---
  // Distribution: #1=25%, #2=15%, #3=12%, #4-10=~7% each (split evenly)
  if (ownerShare > 0 && topAgentIds.length > 0) {
    const ownerDistribution = [0.25, 0.15, 0.12];
    const remainingSlots = Math.min(topAgentIds.length, 10) - 3;
    if (remainingSlots > 0) {
      const perSlot = (1 - 0.25 - 0.15 - 0.12) / Math.max(remainingSlots, 1);
      for (let i = 0; i < remainingSlots; i++) {
        ownerDistribution.push(perSlot);
      }
    }

    for (let i = 0; i < Math.min(topAgentIds.length, 10); i++) {
      const agentId = topAgentIds[i];
      const share = ownerShare * (ownerDistribution[i] || 0);

      if (share <= 0) continue;

      // Find the agent's owner
      const { data: agent } = await supabase
        .from("agents")
        .select("user_id")
        .eq("id", agentId)
        .single();

      if (agent) {
        const { data: owner } = await supabase
          .from("users")
          .select("cp_balance")
          .eq("id", agent.user_id)
          .single();

        if (owner) {
          await supabase
            .from("users")
            .update({ cp_balance: owner.cp_balance + share })
            .eq("id", agent.user_id);

          await supabase.from("cp_transactions").insert({
            user_id: agent.user_id,
            amount: share,
            type: "payout",
            source: "arena_owner_share",
            arena_id: arenaId,
          });
        }
      }
    }
  }
}
