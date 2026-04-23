import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(50),
  riskLevel: z.enum(["conservative", "balanced", "aggressive", "degen"]),
  strategyDescription: z.string().max(500).optional(),
});

const UpdateAgentSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  riskLevel: z.enum(["conservative", "balanced", "aggressive", "degen"]).optional(),
  strategyDescription: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(ip, "read");
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let session;
    try {
      session = await requireAuth(request);
    } catch (res) {
      if (res instanceof Response) {
        return NextResponse.json(JSON.parse(await res.text()), { status: res.status });
      }
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Resolve user ID
    let userId = session.userId;
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", session.userId)
      .maybeSingle();
    if (user) userId = user.id;

    // Fetch user's agents
    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Check which agents are in active arenas
    const agentList = await Promise.all(
      (agents || []).map(async (agent) => {
        let currentArena = null;

        // Check arena_entries for active entry
        const { data: entry } = await supabase
          .from("arena_entries")
          .select("arena_id, status, arenas(name, status)")
          .eq("agent_id", agent.id)
          .eq("status", "active")
          .maybeSingle();

        if (entry) {
          const arena = entry.arenas as unknown as { name: string; status: string } | null;
          currentArena = {
            arenaId: entry.arena_id,
            arenaName: arena?.name || "Unknown",
            arenaStatus: arena?.status || "unknown",
          };
        }

        return {
          id: agent.id,
          name: agent.name,
          riskLevel: agent.risk_level,
          strategyDescription: agent.strategy_description,
          totalArenas: agent.total_arenas || 0,
          totalWins: agent.total_wins || 0,
          bestPnl: agent.best_pnl || 0,
          currentArena,
          createdAt: agent.created_at,
        };
      })
    );

    return NextResponse.json({ agents: agentList });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(ip, "write");
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let session;
    try {
      session = await requireAuth(request);
    } catch (res) {
      if (res instanceof Response) {
        return NextResponse.json(JSON.parse(await res.text()), { status: res.status });
      }
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Resolve user ID
    let userId = session.userId;
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", session.userId)
      .maybeSingle();
    if (user) userId = user.id;

    const { name, riskLevel, strategyDescription } = parsed.data;

    // Create agent without an arena
    const { data: agent, error } = await supabase
      .from("agents")
      .insert({
        user_id: userId,
        arena_id: null,
        name,
        risk_level: riskLevel,
        strategy_description: strategyDescription || null,
        cash_balance: 0,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You already have an agent with this name" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(ip, "write");
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let session;
    try {
      session = await requireAuth(request);
    } catch (res) {
      if (res instanceof Response) {
        return NextResponse.json(JSON.parse(await res.text()), { status: res.status });
      }
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Resolve user ID
    let userId = session.userId;
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", session.userId)
      .maybeSingle();
    if (user) userId = user.id;

    const { agentId, name, riskLevel, strategyDescription } = parsed.data;

    // Verify ownership
    const { data: agent } = await supabase
      .from("agents")
      .select("id, user_id")
      .eq("id", agentId)
      .eq("user_id", userId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check not in active arena
    const { data: activeEntry } = await supabase
      .from("arena_entries")
      .select("id")
      .eq("agent_id", agentId)
      .eq("status", "active")
      .maybeSingle();

    if (activeEntry) {
      return NextResponse.json(
        { error: "Cannot edit an agent while in an active arena" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (riskLevel) updates.risk_level = riskLevel;
    if (strategyDescription !== undefined) updates.strategy_description = strategyDescription || null;

    const { error: updateError } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", agentId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
