import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getArenas } from "@/lib/arena-manager";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const CreateArenaSchema = z.object({
  name: z.string().min(1, "Arena name is required").max(100),
  description: z.string().max(500).optional(),
  startingBalance: z.number().positive().default(10000),
  maxAgents: z.number().int().min(2).max(50).default(20),
  decayRate: z.number().min(0).max(0.1).default(0.001),
  competitionStart: z.string().optional(),
  competitionEnd: z.string().optional(),
  tokens: z
    .array(
      z.object({
        tokenId: z.string().uuid(),
        reserveToken: z.number().positive(),
        reserveBase: z.number().positive(),
      })
    )
    .min(1, "At least one token pool is required"),
});

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limit = rateLimit(ip, "read");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const supabase = createServiceClient();
    const arenas = await getArenas(supabase, status);

    // Fetch agent counts for each arena
    const arenasWithCounts = await Promise.all(
      arenas.map(async (arena) => {
        const { count } = await supabase
          .from("agents")
          .select("*", { count: "exact", head: true })
          .eq("arena_id", arena.id);

        return {
          ...arena,
          agentCount: count ?? 0,
        };
      })
    );

    return NextResponse.json({ arenas: arenasWithCounts });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const supabase = createServiceClient();

    // Require admin
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.userId)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!adminUser.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    const parsed = CreateArenaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      startingBalance,
      maxAgents,
      decayRate,
      competitionStart,
      competitionEnd,
      tokens,
    } = parsed.data;

    // Create arena
    const { data: arena, error: arenaError } = await supabase
      .from("arenas")
      .insert({
        name,
        description: description || null,
        status: "upcoming",
        starting_balance: startingBalance,
        max_agents: maxAgents,
        decay_rate: decayRate,
        competition_start: competitionStart || null,
        competition_end: competitionEnd || null,
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (arenaError) {
      console.error("Failed to create arena:", arenaError);
      return NextResponse.json(
        { error: "Failed to create arena" },
        { status: 500 }
      );
    }

    // Fetch vUSD base token
    const { data: baseToken } = await supabase
      .from("platform_tokens")
      .select("id")
      .eq("is_base_currency", true)
      .single();

    const baseTokenId = baseToken?.id;

    // Create pools for each token
    for (const tokenConfig of tokens) {
      await supabase.from("pools").insert({
        arena_id: arena.id,
        token_id: tokenConfig.tokenId,
        base_token_id: baseTokenId || tokenConfig.tokenId,
        reserve_token: tokenConfig.reserveToken,
        reserve_base: tokenConfig.reserveBase,
        fee_rate: 0.003,
        total_volume: 0,
      });

      // Create arena_tokens entry
      await supabase.from("arena_tokens").insert({
        arena_id: arena.id,
        token_id: tokenConfig.tokenId,
      });
    }

    return NextResponse.json({ arena }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
