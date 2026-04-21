import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    const supabase = createServiceClient();

    // Lookup user by wallet address
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", wallet.toLowerCase())
      .maybeSingle();

    if (userError) {
      console.error("Failed to fetch user:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch user profile/stats
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        wallet_address: user.wallet_address,
        created_at: user.created_at,
      },
      profile: profile || {
        total_arenas: 0,
        wins: 0,
        top3_finishes: 0,
        best_pnl: 0,
        total_trades: 0,
        reputation: 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
