import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch current agent to verify ownership and get current state
    const { data: agent, error: fetchError } = await supabase
      .from("agents")
      .select("user_id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to fetch agent:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch agent" },
        { status: 500 }
      );
    }

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.user_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle is_active
    const { data: updated, error: updateError } = await supabase
      .from("agents")
      .update({ is_active: !agent.is_active })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to toggle agent:", updateError);
      return NextResponse.json(
        { error: "Failed to toggle agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
