import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/user/claim-cp
 * Explicit claim of the 100 CP signup bonus.
 * Idempotent — checks if already claimed.
 */
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

    // Check if already claimed
    const { data: existing } = await supabase
      .from("cp_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("source", "signup_bonus")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        message: "Already claimed",
        cpBalance: user.cp_balance,
      });
    }

    // Award 100 CP
    const bonus = 100;
    await supabase
      .from("users")
      .update({ cp_balance: user.cp_balance + bonus })
      .eq("id", user.id);

    await supabase.from("cp_transactions").insert({
      user_id: user.id,
      amount: bonus,
      type: "earn",
      source: "signup_bonus",
    });

    return NextResponse.json({
      message: "Claimed",
      cpCredited: bonus,
      cpBalance: user.cp_balance + bonus,
    });
  } catch (error) {
    console.error("Claim CP failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
