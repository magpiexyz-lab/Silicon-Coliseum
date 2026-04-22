import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { finalizeArena } from "@/lib/arena-manager";

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const cronSecret =
      request.headers.get("x-cron-secret") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Find arenas that are active and past their competition_end
    const { data: arenas, error } = await supabase
      .from("arenas")
      .select("*")
      .eq("status", "active")
      .lt("competition_end", new Date().toISOString());

    if (error) {
      console.error("Failed to fetch arenas for finalization:", error);
      return NextResponse.json(
        { error: "Failed to fetch arenas" },
        { status: 500 }
      );
    }

    if (!arenas || arenas.length === 0) {
      return NextResponse.json({
        message: "No arenas to finalize",
        finalized: [],
      });
    }

    const finalized: string[] = [];
    const errors: string[] = [];

    for (const arena of arenas) {
      try {
        await finalizeArena(supabase, arena.id);
        finalized.push(arena.id);
      } catch (err) {
        console.error(`Failed to finalize arena ${arena.id}:`, err);
        errors.push(
          `${arena.id}: ${err instanceof Error ? err.message : "unknown error"}`
        );
      }
    }

    return NextResponse.json({
      message: `Finalized ${finalized.length} arena(s)`,
      finalized,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron finalize failed:", error);
    return NextResponse.json(
      { error: "Finalization failed" },
      { status: 500 }
    );
  }
}
