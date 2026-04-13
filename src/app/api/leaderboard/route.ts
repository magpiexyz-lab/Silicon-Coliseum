import { NextResponse } from "next/server";
import { SUPPORTED_TOKENS } from "@/lib/tokens";
import { fetchTokenPrices } from "@/lib/market";
import { calculateLeaderboard } from "@/lib/leaderboard";

export async function GET() {
  try {
    // Fetch live token prices
    const prices = await fetchTokenPrices(SUPPORTED_TOKENS);

    // Calculate leaderboard
    const leaderboard = await calculateLeaderboard(prices);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Failed to calculate leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
