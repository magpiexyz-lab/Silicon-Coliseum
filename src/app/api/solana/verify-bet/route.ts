import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { Connection } from "@solana/web3.js";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { SOLANA_RPC_URL, MIN_BET_LAMPORTS } from "@/lib/solana/constants";

const VerifyBetSchema = z.object({
  txSignature: z.string().min(80).max(100),
  walletAddress: z.string().min(32).max(50),
  arenaId: z.string().uuid(),
  agentId: z.string().uuid(),
  solAmount: z.number().positive(),
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
    const parsed = VerifyBetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { txSignature, walletAddress, arenaId, agentId, solAmount } =
      parsed.data;
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

    // Check duplicate
    const { data: existing } = await supabase
      .from("sol_transactions")
      .select("id")
      .eq("tx_signature", txSignature)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 409 }
      );
    }

    // Check arena exists and accepts SOL bets
    const { data: arena } = await supabase
      .from("arenas")
      .select("id, status, bet_type, betting_phase_end")
      .eq("id", arenaId)
      .single();

    if (!arena) {
      return NextResponse.json(
        { error: "Arena not found" },
        { status: 404 }
      );
    }

    if (arena.bet_type === "cp_only") {
      return NextResponse.json(
        { error: "This arena only accepts CP bets" },
        { status: 400 }
      );
    }

    // Check betting phase
    if (arena.betting_phase_end) {
      const now = new Date();
      const bettingEnd = new Date(arena.betting_phase_end);
      if (now > bettingEnd) {
        return NextResponse.json(
          { error: "Betting phase has ended for this arena" },
          { status: 400 }
        );
      }
    }

    // Check user is spectator (no agent in arena)
    const { data: userAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("arena_id", arenaId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (userAgent) {
      return NextResponse.json(
        { error: "Participants cannot bet on their own arena" },
        { status: 400 }
      );
    }

    // Check minimum bet
    if (BigInt(solAmount) < MIN_BET_LAMPORTS) {
      return NextResponse.json(
        { error: "Bet amount below minimum (0.01 SOL)" },
        { status: 400 }
      );
    }

    // Verify transaction on-chain
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const tx = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || tx.meta?.err) {
      return NextResponse.json(
        { error: "Transaction not found or failed on-chain" },
        { status: 400 }
      );
    }

    // Record sol_transaction
    await supabase.from("sol_transactions").insert({
      user_id: user.id,
      wallet_address: walletAddress,
      tx_signature: txSignature,
      tx_type: "place_bet",
      sol_amount: solAmount,
      arena_id: arenaId,
      agent_id: agentId,
      status: "confirmed",
    });

    // Record bet in bets table (SOL currency)
    const { data: bet, error: betError } = await supabase
      .from("bets")
      .insert({
        arena_id: arenaId,
        user_id: user.id,
        agent_id: agentId,
        cp_amount: 0,
        sol_amount: solAmount,
        bet_currency: "sol",
        status: "pending",
        payout: 0,
        tx_signature: txSignature,
        wallet_address: walletAddress,
      })
      .select()
      .single();

    if (betError) {
      return NextResponse.json(
        { error: `Failed to record bet: ${betError.message}` },
        { status: 500 }
      );
    }

    // Update user wallet address
    await supabase
      .from("users")
      .update({ wallet_address: walletAddress })
      .eq("id", user.id);

    return NextResponse.json({ bet }, { status: 201 });
  } catch (error) {
    console.error("Verify bet failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
