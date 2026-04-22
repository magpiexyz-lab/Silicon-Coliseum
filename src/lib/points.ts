import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Coliseum Points (CP) -- balance management.
 * CP is the platform currency for betting and rewards.
 */

/**
 * Award signup bonus of 100 CP to a new user.
 */
export async function awardSignupBonus(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const bonus = 100;

  const { data: user } = await supabase
    .from("users")
    .select("cp_balance")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  await supabase
    .from("users")
    .update({ cp_balance: user.cp_balance + bonus })
    .eq("id", userId);

  await supabase.from("cp_transactions").insert({
    user_id: userId,
    amount: bonus,
    type: "earn",
    source: "signup_bonus",
    arena_id: null,
  });
}

/**
 * Award 10 CP for entering any arena (flat participation reward).
 */
export async function awardArenaParticipation(
  supabase: SupabaseClient,
  userId: string,
  arenaId: string
): Promise<void> {
  const reward = 10;

  const { data: user } = await supabase
    .from("users")
    .select("cp_balance")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  await supabase
    .from("users")
    .update({ cp_balance: user.cp_balance + reward })
    .eq("id", userId);

  await supabase.from("cp_transactions").insert({
    user_id: userId,
    amount: reward,
    type: "earn",
    source: "arena_participation",
    arena_id: arenaId,
  });
}

/**
 * Award CP based on arena final rank.
 * #1 = 50 CP, #2 = 35 CP, #3 = 25 CP, #4-10 = 10 CP
 */
export async function awardArenaReward(
  supabase: SupabaseClient,
  userId: string,
  arenaId: string,
  rank: number
): Promise<void> {
  let reward: number;
  if (rank === 1) reward = 50;
  else if (rank === 2) reward = 35;
  else if (rank === 3) reward = 25;
  else if (rank >= 4 && rank <= 10) reward = 10;
  else return; // No reward outside top 10

  const { data: user } = await supabase
    .from("users")
    .select("cp_balance")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  await supabase
    .from("users")
    .update({ cp_balance: user.cp_balance + reward })
    .eq("id", userId);

  await supabase.from("cp_transactions").insert({
    user_id: userId,
    amount: reward,
    type: "earn",
    source: "arena_reward",
    arena_id: arenaId,
  });
}

/**
 * Spend CP. Returns false if insufficient balance.
 */
export async function spendCP(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  source: string,
  arenaId?: string
): Promise<boolean> {
  if (amount <= 0) return false;

  const { data: user } = await supabase
    .from("users")
    .select("cp_balance")
    .eq("id", userId)
    .single();

  if (!user || user.cp_balance < amount) return false;

  const { error } = await supabase
    .from("users")
    .update({ cp_balance: user.cp_balance - amount })
    .eq("id", userId);

  if (error) return false;

  await supabase.from("cp_transactions").insert({
    user_id: userId,
    amount: -amount,
    type: "spend",
    source,
    arena_id: arenaId || null,
  });

  return true;
}

/**
 * Get user's current CP balance.
 */
export async function getBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: user } = await supabase
    .from("users")
    .select("cp_balance")
    .eq("id", userId)
    .single();

  return user?.cp_balance ?? 0;
}
