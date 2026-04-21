import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { joinArena } from "@/lib/arena-manager";

const JoinArenaSchema = z.object({
  agent_id: z.string().min(1, "agent_id is required"),
});

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = JoinArenaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { id: arenaId } = await params;
    const { agent_id } = parsed.data;

    // Verify user owns the agent
    const supabase = createServiceClient();
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, user_id")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.user_id !== session.userId) {
      return NextResponse.json(
        { error: "You do not own this agent" },
        { status: 403 }
      );
    }

    const entry = await joinArena(arenaId, agent_id, session.userId);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("prep phase") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
