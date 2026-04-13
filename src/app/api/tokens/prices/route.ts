import { NextResponse } from "next/server";
import { SUPPORTED_TOKENS } from "@/lib/tokens";
import { fetchTokenPrices } from "@/lib/market";

export async function GET() {
  try {
    const prices = await fetchTokenPrices(SUPPORTED_TOKENS);

    // Convert Map to plain object for JSON serialization
    const pricesObj: Record<string, unknown> = {};
    for (const [symbol, data] of prices.entries()) {
      pricesObj[symbol] = data;
    }

    return NextResponse.json({ prices: pricesObj });
  } catch (error) {
    console.error("Failed to fetch token prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch token prices" },
      { status: 500 }
    );
  }
}
