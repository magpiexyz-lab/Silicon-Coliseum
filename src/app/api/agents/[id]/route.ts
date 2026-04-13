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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch agent with user info
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*, users!inner(username)")
      .eq("id", id)
      .maybeSingle();

    if (agentError) {
      console.error("Failed to fetch agent:", agentError);
      return NextResponse.json(
        { error: "Failed to fetch agent" },
        { status: 500 }
      );
    }

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Fetch holdings
    const { data: holdings } = await supabase
      .from("holdings")
      .select("*")
      .eq("agent_id", id);

    // Fetch recent trades (last 20)
    const { data: trades } = await supabase
      .from("trades")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch recent decisions (last 10)
    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    const result = {
      ...agent,
      username: (agent.users as unknown as { username: string })?.username,
      users: undefined,
      holdings: holdings || [],
      trades: trades || [],
      decisions: decisions || [],
    };

    return NextResponse.json({ agent: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Verify ownership
    const { data: agent } = await supabase
      .from("agents")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.user_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete related data first, then the agent
    await supabase.from("decisions").delete().eq("agent_id", id);
    await supabase.from("trades").delete().eq("agent_id", id);
    await supabase.from("holdings").delete().eq("agent_id", id);
    await supabase.from("share_tokens").delete().eq("agent_id", id);

    const { error: deleteError } = await supabase
      .from("agents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Failed to delete agent:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
