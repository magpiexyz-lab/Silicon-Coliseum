import { NextResponse } from "next/server";
import { calculateArenaLeaderboard } from "@/lib/leaderboard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leaderboard = await calculateArenaLeaderboard(id);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Failed to calculate leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
