import { NextResponse } from "next/server";
import { getPoolById, getPoolHistory } from "@/lib/pool-manager";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [pool, history] = await Promise.all([
      getPoolById(id),
      getPoolHistory(id, 100),
    ]);

    return NextResponse.json({ pool, history });
  } catch (error) {
    console.error("Failed to fetch pool:", error);
    return NextResponse.json(
      { error: "Failed to fetch pool" },
      { status: 500 }
    );
  }
}
