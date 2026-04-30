import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const ClaimSchema = z.object({
  txSignature: z.string().min(80).max(100),
  rewardId: z.string().uuid(),
  walletAddress: z.string().min(32).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const limit = rateLimit(ip, "write");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    let session;
    try {
      session = await requireAuth(request);
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { txSignature, rewardId, walletAddress } = parsed.data;
    const supabase = createServiceClient();

    // Resolve user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .or(`id.eq.${session.userId},auth_id.eq.${session.userId}`)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch reward
    const { data: reward } = await supabase
      .from("sol_rewards")
      .select("*")
      .eq("id", rewardId)
      .eq("user_id", user.id)
      .single();

    if (!reward) {
      return NextResponse.json(
        { error: "Reward not found" },
        { status: 404 }
      );
    }

    if (reward.is_claimed) {
      return NextResponse.json(
        { error: "Reward already claimed" },
        { status: 400 }
      );
    }

    // Mark reward as claimed
    await supabase
      .from("sol_rewards")
      .update({
        is_claimed: true,
        claim_tx: txSignature,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", rewardId);

    // Record sol_transaction
    await supabase.from("sol_transactions").insert({
      user_id: user.id,
      wallet_address: walletAddress,
      tx_signature: txSignature,
      tx_type: "claim_reward",
      sol_amount: reward.sol_amount,
      arena_id: reward.arena_id,
      status: "confirmed",
    });

    return NextResponse.json({
      claimed: true,
      solAmount: reward.sol_amount,
      txSignature,
    });
  } catch (error) {
    console.error("Claim reward failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
