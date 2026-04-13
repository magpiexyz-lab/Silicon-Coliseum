import { NextResponse } from "next/server";
import { z } from "zod";
import { ethers } from "ethers";
import { createServiceClient } from "@/lib/supabase-server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const SignupSchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username must contain only letters, numbers, and underscores"
    ),
  wallet_address: z
    .string()
    .min(1, "wallet_address is required")
    .transform((v) => v.toLowerCase()),
  signature: z.string().min(1, "signature is required"),
  message: z.string().min(1, "message is required"),
});

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limit = rateLimit(ip, "write");
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, wallet_address, signature, message } = parsed.data;

    // Verify signature
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
    } catch {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    if (recoveredAddress !== wallet_address) {
      return NextResponse.json(
        { error: "Signature does not match wallet address" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if wallet already registered
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", wallet_address)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "Wallet address already registered" },
        { status: 409 }
      );
    }

    // Check if username taken
    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Insert user
    const { data: user, error: insertError } = await supabase
      .from("users")
      .insert({
        username,
        wallet_address,
        signature,
        message,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Signup insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create JWT session
    const token = await createSession(user.id, wallet_address);

    const response = NextResponse.json({ success: true, user });
    setSessionCookie(response, token);

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
