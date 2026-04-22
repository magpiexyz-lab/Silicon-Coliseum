import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { getBalance } from "@/lib/points";
import { rateLimit } from "@/lib/rate-limit";

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

    const supabase = createServiceClient();

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
      } else {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
    }

    const balance = await getBalance(supabase, userId);

    // Fetch recent transactions
    const { data: transactions } = await supabase
      .from("cp_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const formattedTransactions = (transactions || []).map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      source: t.source,
      arenaId: t.arena_id,
      createdAt: t.created_at,
    }));

    return NextResponse.json({
      balance,
      transactions: formattedTransactions,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
