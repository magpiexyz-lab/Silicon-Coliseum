import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";

const CreateAgentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(30, "Name must be at most 30 characters"),
  risk_level: z.enum(["conservative", "balanced", "aggressive", "degen"]),
  personality: z.string().max(500).optional(),
  strategy_description: z.string().max(1000).optional(),
});

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    const supabase = createServiceClient();

    let query = supabase
      .from("agents")
      .select("*, users!inner(username)")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: agents, error } = await query;

    if (error) {
      console.error("Failed to fetch agents:", error);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Flatten the joined username
    const result = (agents || []).map((agent) => ({
      ...agent,
      username: (agent.users as unknown as { username: string })?.username,
      users: undefined,
    }));

    return NextResponse.json({ agents: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, risk_level, personality, strategy_description } = parsed.data;

    const supabase = createServiceClient();

    // Insert agent — no SCT gating, no tokens field, no budget
    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        user_id: session.userId,
        name,
        risk_level,
        initial_budget: 0, // Set when joining arena
        current_balance: 0,
        tokens: [], // Legacy field
        is_active: true,
        personality: personality || null,
        strategy_description: strategy_description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create agent:", insertError);
      return NextResponse.json(
        { error: "Failed to create agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
