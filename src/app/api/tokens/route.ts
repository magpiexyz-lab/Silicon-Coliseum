import { NextResponse } from "next/server";
import { SUPPORTED_TOKENS } from "@/lib/tokens";

export async function GET() {
  return NextResponse.json({ tokens: SUPPORTED_TOKENS });
}
