import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { placeBet } from "@/lib/betting";
import { rateLimit } from "@/lib/rate-limit";

const BetSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID"),
  cpAmount: z.number().int().positive("Bet amount must be positive"),
  betCurrency: z.enum(["cp", "sol"]).default("cp"),
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
    const parsed = BetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { agentId, cpAmount, betCurrency } = parsed.data;

    // SOL bets are handled via /api/solana/verify-bet
    if (betCurrency === "sol") {
      return NextResponse.json(
        { error: "SOL bets must be placed via /api/solana/verify-bet" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check betting phase
    const { data: arenaData } = await supabase
      .from("arenas")
      .select("betting_phase_end")
      .eq("id", arenaId)
      .single();

    if (arenaData?.betting_phase_end) {
      const now = new Date();
      const bettingEnd = new Date(arenaData.betting_phase_end);
      if (now > bettingEnd) {
        return NextResponse.json(
          { error: "Betting phase has ended for this arena" },
          { status: 400 }
        );
      }
    }

    // Resolve internal userId
    let userId = session.userId;
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", session.userId)
      .maybeSingle();

    if (!user) {
      const { data: userByAuth } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", session.userId)
        .maybeSingle();
      if (userByAuth) {
        userId = userByAuth.id;
      }
    }

    await placeBet(supabase, arenaId, userId, agentId, cpAmount);

    // Fetch the created bet
    const { data: bet } = await supabase
      .from("bets")
      .select("*")
      .eq("arena_id", arenaId)
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ bet }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    if (
      message.includes("Insufficient") ||
      message.includes("cannot bet") ||
      message.includes("Participants")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
