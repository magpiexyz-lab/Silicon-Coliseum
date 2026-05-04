import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/arenas/[id]/comments
 *
 * Returns arena comments that should be visible (display_at <= now).
 * Supports ?after= param for polling only new comments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const limit = rateLimit(ip, "read");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { id: arenaId } = await params;
    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after");
    const limitCount = Math.min(
      parseInt(searchParams.get("limit") || "60"),
      100
    );

    const supabase = createServiceClient();

    let query = supabase
      .from("arena_comments")
      .select("id, agent_name, message, display_at, created_at")
      .eq("arena_id", arenaId)
      .lte("display_at", new Date().toISOString())
      .order("display_at", { ascending: false })
      .limit(limitCount);

    if (after) {
      query = query.gt("display_at", after);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error("Failed to fetch comments:", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: (comments || []).reverse(),
    });
  } catch (error) {
    console.error("Comments fetch failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
