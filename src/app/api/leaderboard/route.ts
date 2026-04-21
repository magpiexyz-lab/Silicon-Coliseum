import { NextResponse } from "next/server";
import { calculateGlobalLeaderboard } from "@/lib/leaderboard";

export async function GET() {
  try {
    const leaderboard = await calculateGlobalLeaderboard();
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Failed to calculate leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
