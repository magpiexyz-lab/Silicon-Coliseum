import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { Connection } from "@solana/web3.js";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { SOLANA_RPC_URL, CP_PER_SOL } from "@/lib/solana/constants";

const BuyCpSchema = z.object({
  txSignature: z.string().min(80).max(100),
  walletAddress: z.string().min(32).max(50),
  solAmount: z.number().positive(),
  expectedCp: z.number().int().positive(),
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
    const parsed = BuyCpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { txSignature, walletAddress, solAmount, expectedCp } = parsed.data;
    const supabase = createServiceClient();

    // Resolve user
    const { data: user } = await supabase
      .from("users")
      .select("id, cp_balance")
      .or(`id.eq.${session.userId},auth_id.eq.${session.userId}`)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for duplicate transaction
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

    // Calculate CP from actual SOL amount
    const lamports = solAmount;
    const cpAmount = Math.floor(lamports / (1_000_000_000 / CP_PER_SOL));

    if (cpAmount <= 0) {
      return NextResponse.json(
        { error: "Amount too small for CP conversion" },
        { status: 400 }
      );
    }

    // Record transaction
    await supabase.from("sol_transactions").insert({
      user_id: user.id,
      wallet_address: walletAddress,
      tx_signature: txSignature,
      tx_type: "buy_cp",
      sol_amount: lamports,
      cp_amount: cpAmount,
      status: "confirmed",
    });

    // Credit CP to user
    await supabase
      .from("users")
      .update({ cp_balance: user.cp_balance + cpAmount, wallet_address: walletAddress })
      .eq("id", user.id);

    // Record CP transaction
    await supabase.from("cp_transactions").insert({
      user_id: user.id,
      amount: cpAmount,
      type: "earn",
      source: "sol_purchase",
    });

    return NextResponse.json({
      cpCredited: cpAmount,
      newBalance: user.cp_balance + cpAmount,
      txSignature,
    });
  } catch (error) {
    console.error("Buy CP verification failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
