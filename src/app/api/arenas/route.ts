import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const supabase = createServiceClient();

    let query = supabase
      .from("arenas")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: arenas, error } = await query;

    if (error) {
      console.error("Failed to fetch arenas:", error);
      return NextResponse.json(
        { error: "Failed to fetch arenas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ arenas: arenas || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
