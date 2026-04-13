import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    // Get total count
    const { count: total, error: countError } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId);

    if (countError) {
      console.error("Failed to count trades:", countError);
      return NextResponse.json(
        { error: "Failed to fetch trades" },
        { status: 500 }
      );
    }

    // Get paginated trades
    const { data: trades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Failed to fetch trades:", error);
      return NextResponse.json(
        { error: "Failed to fetch trades" },
        { status: 500 }
      );
    }

    const totalCount = total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      trades: trades || [],
      total: totalCount,
      page,
      totalPages,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
