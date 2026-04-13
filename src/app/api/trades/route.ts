import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: trades, error } = await supabase
      .from("trades")
      .select("*, agents!inner(name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch trades:", error);
      return NextResponse.json(
        { error: "Failed to fetch trades" },
        { status: 500 }
      );
    }

    // Flatten the joined agent name
    const result = (trades || []).map((trade) => ({
      ...trade,
      agent_name: (trade.agents as unknown as { name: string })?.name,
      agents: undefined,
    }));

    return NextResponse.json({ trades: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
