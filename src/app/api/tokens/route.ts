import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: tokens, error } = await supabase
      .from("platform_tokens")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch platform tokens:", error);
      return NextResponse.json(
        { error: "Failed to fetch tokens" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens: tokens || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
