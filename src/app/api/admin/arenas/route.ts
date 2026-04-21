import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-server";
import {
  createArena,
  transitionPhase,
  listArenas,
} from "@/lib/arena-manager";
import type { ArenaPhase } from "@/lib/types";

const CreateArenaSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  entry_fee: z.number().min(0).optional(),
  prize_pool: z.number().min(0).optional(),
  starting_balance: z.number().min(0).optional(),
  max_agents_per_user: z.number().int().min(1).optional(),
  competition_start: z.string().optional(),
  competition_end: z.string().optional(),
  challenge_end: z.string().optional(),
  decay_rate: z.number().min(0).max(1).optional(),
});

const UpdateArenaSchema = z.object({
  id: z.string().uuid("Arena id is required"),
  phase: z
    .enum(["prep", "competition", "challenge", "rewards", "closed"])
    .optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  entry_fee: z.number().min(0).optional(),
  prize_pool: z.number().min(0).optional(),
  starting_balance: z.number().min(0).optional(),
  max_agents_per_user: z.number().int().min(1).optional(),
  competition_start: z.string().optional(),
  competition_end: z.string().optional(),
  challenge_end: z.string().optional(),
  decay_rate: z.number().min(0).max(1).optional(),
});

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

// GET: List all arenas, optional ?status filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const arenas = await listArenas(status);
    return NextResponse.json({ arenas });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list arenas";
    console.error("Failed to list arenas:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Create a new arena (admin only)
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
    const parsed = CreateArenaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const arena = await createArena({
      ...parsed.data,
      created_by: session.userId,
    });

    return NextResponse.json({ arena }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create arena";
    console.error("Arena creation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update arena / transition phase (admin only)
export async function PATCH(request: Request) {
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
    const parsed = UpdateArenaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { id, phase, ...otherFields } = parsed.data;

    // If phase is provided, use transitionPhase for validated phase transitions
    if (phase) {
      const arena = await transitionPhase(id, phase as ArenaPhase);
      return NextResponse.json({ arena });
    }

    // Otherwise, do a direct field update
    const updateData: Record<string, unknown> = {
      ...otherFields,
      updated_at: new Date().toISOString(),
    };

    const supabase = createServiceClient();
    const { data: arena, error } = await supabase
      .from("arenas")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update arena:", error);
      return NextResponse.json(
        { error: "Failed to update arena" },
        { status: 500 }
      );
    }

    return NextResponse.json({ arena });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update arena";
    console.error("Arena update error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
