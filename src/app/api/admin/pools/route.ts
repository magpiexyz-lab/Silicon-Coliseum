import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-server";
import { createPool } from "@/lib/pool-manager";

const CreatePoolSchema = z.object({
  arena_id: z.string().uuid("Invalid arena_id"),
  token_a: z.string().uuid("Invalid token_a"),
  token_b: z.string().uuid("Invalid token_b"),
  reserve_a: z.number().positive("reserve_a must be positive"),
  reserve_b: z.number().positive("reserve_b must be positive"),
  fee_rate: z.number().min(0).max(1).optional(),
});

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

// GET: List pools, optionally filter by ?arena_id
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const arenaId = searchParams.get("arena_id");

    const supabase = createServiceClient();

    let query = supabase
      .from("pools")
      .select(
        `*,
        token_a_ref:platform_tokens!pools_token_a_fkey(symbol, name),
        token_b_ref:platform_tokens!pools_token_b_fkey(symbol, name)`
      );

    if (arenaId) {
      query = query.eq("arena_id", arenaId);
    }

    const { data: pools, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Failed to fetch pools:", error);
      return NextResponse.json(
        { error: "Failed to fetch pools" },
        { status: 500 }
      );
    }

    // Flatten joined token symbols
    const result = (pools || []).map((p: Record<string, unknown>) => ({
      ...p,
      token_a_symbol: (p.token_a_ref as { symbol: string } | null)?.symbol,
      token_b_symbol: (p.token_b_ref as { symbol: string } | null)?.symbol,
      token_a_name: (p.token_a_ref as { name: string } | null)?.name,
      token_b_name: (p.token_b_ref as { name: string } | null)?.name,
      token_a_ref: undefined,
      token_b_ref: undefined,
    }));

    return NextResponse.json({ pools: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new pool (admin only)
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = requireAdmin(session.walletAddress);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreatePoolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { arena_id, token_a, token_b, reserve_a, reserve_b, fee_rate } =
      parsed.data;

    const pool = await createPool(
      arena_id,
      token_a,
      token_b,
      reserve_a,
      reserve_b,
      fee_rate
    );

    return NextResponse.json({ pool }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create pool";
    console.error("Pool creation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
