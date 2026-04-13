import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";

const CheckSchema = z.object({
  wallet_address: z
    .string()
    .min(1, "wallet_address is required")
    .transform((v) => v.toLowerCase()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { wallet_address } = parsed.data;
    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("username")
      .eq("wallet_address", wallet_address)
      .maybeSingle();

    if (error) {
      console.error("Auth check error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (user) {
      return NextResponse.json({ registered: true, username: user.username });
    }

    return NextResponse.json({ registered: false });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
