import { NextResponse } from "next/server";
import { z } from "zod";
import { ethers } from "ethers";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { SCT_CONTRACT_ADDRESS, SCT_ABI, RPC_URL } from "@/lib/contract";

const CreateAgentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(30, "Name must be at most 30 characters"),
  risk_level: z.enum(["conservative", "balanced", "aggressive", "degen"]),
  initial_budget: z.number().min(10).max(100000),
  tokens: z.array(z.string()).min(1).max(12),
  personality: z.string().max(500).optional(),
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

    const { name, risk_level, initial_budget, tokens, personality } =
      parsed.data;

    const supabase = createServiceClient();

    // Count existing agents for this user
    const { count: agentCount, error: countError } = await supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId);

    if (countError) {
      console.error("Failed to count agents:", countError);
      return NextResponse.json(
        { error: "Failed to verify agent count" },
        { status: 500 }
      );
    }

    const currentAgentCount = agentCount ?? 0;

    // SCT balance check (skip if no contract address configured)
    if (
      process.env.SCT_CONTRACT_ADDRESS &&
      SCT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"
    ) {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(
          SCT_CONTRACT_ADDRESS,
          SCT_ABI,
          provider
        );
        const balance = await contract.wholeTokenBalance(
          session.walletAddress
        );
        const sctBalance = Number(balance);

        if (sctBalance < currentAgentCount + 1) {
          return NextResponse.json(
            {
              error: `Insufficient SCT balance. You need ${currentAgentCount + 1} SCT but have ${sctBalance}.`,
            },
            { status: 403 }
          );
        }
      } catch (err) {
        console.error("SCT balance check failed:", err);
        // In case of RPC error, allow creation (graceful degradation)
      }
    }

    // Insert agent
    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        user_id: session.userId,
        name,
        risk_level,
        initial_budget,
        current_balance: initial_budget,
        tokens,
        is_active: true,
        personality: personality || null,
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
