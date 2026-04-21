import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch arena
    const { data: arena, error: arenaError } = await supabase
      .from("arenas")
      .select("*")
      .eq("id", id)
      .single();

    if (arenaError && arenaError.code !== "PGRST116") {
      console.error("Failed to fetch arena:", arenaError);
      return NextResponse.json(
        { error: "Failed to fetch arena" },
        { status: 500 }
      );
    }

    if (!arena) {
      return NextResponse.json({ error: "Arena not found" }, { status: 404 });
    }

    // Fetch arena tokens with joined platform_tokens info
    const { data: arenaTokens } = await supabase
      .from("arena_tokens")
      .select("*, platform_tokens(symbol, name, image_url)")
      .eq("arena_id", id);

    // Count arena entries
    const { count: entryCount } = await supabase
      .from("arena_entries")
      .select("*", { count: "exact", head: true })
      .eq("arena_id", id);

    return NextResponse.json({
      arena,
      tokens: arenaTokens || [],
      entryCount: entryCount ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
