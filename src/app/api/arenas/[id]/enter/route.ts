import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { enterArena } from "@/lib/arena-manager";
import { rateLimit } from "@/lib/rate-limit";

const EnterArenaSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  riskLevel: z
    .enum(["conservative", "balanced", "aggressive", "degen"])
    .default("balanced"),
  strategyDescription: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  agentId: z.string().uuid().optional(),
  quickDeploy: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limit = rateLimit(ip, "write");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    let session;
    try {
      session = await requireAuth(request);
    } catch (res) {
      if (res instanceof Response) {
        return NextResponse.json(
          JSON.parse(await res.text()),
          { status: res.status }
        );
      }
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: arenaId } = await params;
    const body = await request.json();
    const parsed = EnterArenaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { riskLevel, strategyDescription, agentId, avatarUrl } = parsed.data;

    // Look up user in users table to get internal ID
    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", session.userId)
      .maybeSingle();

    // Also try by auth_id if not found
    let userId = session.userId;
    let username = "Agent";
    if (user) {
      userId = user.id;
      username = user.username;
    } else {
      const { data: userByAuth } = await supabase
        .from("users")
        .select("id, username")
        .eq("auth_id", session.userId)
        .maybeSingle();
      if (userByAuth) {
        userId = userByAuth.id;
        username = userByAuth.username;
      }
    }

    // Check CP balance for agent creation (10,000 CP required)
    const AGENT_CREATION_COST = 10000;
    const { data: cpCheck } = await supabase
      .from("users")
      .select("cp_balance")
      .eq("id", userId)
      .single();

    if (!cpCheck || cpCheck.cp_balance < AGENT_CREATION_COST) {
      return NextResponse.json(
        {
          error: `Insufficient CP. Agent creation requires ${AGENT_CREATION_COST.toLocaleString()} CP. You have ${cpCheck?.cp_balance?.toLocaleString() || 0} CP. Buy CP with SOL or win bets to earn more.`,
        },
        { status: 400 }
      );
    }

    // Deduct CP for agent creation
    await supabase
      .from("users")
      .update({ cp_balance: cpCheck.cp_balance - AGENT_CREATION_COST })
      .eq("id", userId);

    await supabase.from("cp_transactions").insert({
      user_id: userId,
      amount: -AGENT_CREATION_COST,
      type: "spend",
      source: "agent_creation",
      arena_id: arenaId,
    });

    const agentName = parsed.data.name || `${username}'s Agent`;

    let agent;
    try {
      agent = await enterArena(supabase, arenaId, userId, {
        name: agentName,
        riskLevel,
        strategyDescription,
        avatarUrl,
        agentId,
      });
    } catch (enterError) {
      // Refund CP if agent creation fails
      await supabase
        .from("users")
        .update({ cp_balance: cpCheck.cp_balance })
        .eq("id", userId);

      await supabase
        .from("cp_transactions")
        .delete()
        .eq("user_id", userId)
        .eq("source", "agent_creation")
        .eq("arena_id", arenaId);

      throw enterError;
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    if (
      message.includes("not found") ||
      message.includes("not accepting") ||
      message.includes("full") ||
      message.includes("already have") ||
      message.includes("already in") ||
      message.includes("Insufficient CP")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
