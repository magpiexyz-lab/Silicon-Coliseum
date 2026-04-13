import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { generateShareToken } from "@/lib/share";

const ShareSchema = z.object({
  agent_id: z.string().uuid("Invalid agent ID"),
});

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ShareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { agent_id } = parsed.data;
    const supabase = createServiceClient();

    // Verify ownership
    const { data: agent } = await supabase
      .from("agents")
      .select("user_id")
      .eq("id", agent_id)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.user_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const token = await generateShareToken(agent_id);

    // Build the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${baseUrl}/share/${token}`;

    return NextResponse.json({ token, url });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
