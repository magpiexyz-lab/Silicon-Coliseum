import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-server";

const CreateTokenSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  image_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

// GET: List all platform tokens (no auth required)
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: tokens, error } = await supabase
      .from("platform_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch platform tokens:", error);
      return NextResponse.json(
        { error: "Failed to fetch tokens" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens: tokens || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new platform token (admin only)
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
    const parsed = CreateTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { symbol, name, image_url, description } = parsed.data;
    const supabase = createServiceClient();

    const { data: token, error } = await supabase
      .from("platform_tokens")
      .insert({
        symbol,
        name,
        image_url: image_url || null,
        description: description || null,
        created_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create token:", error);
      return NextResponse.json(
        { error: "Failed to create token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
