import { NextResponse } from "next/server";
import { getAllPrices } from "@/lib/price-feed";

/**
 * GET /api/prices
 * Returns current real-world prices for all Silicon tokens.
 * Public endpoint (no auth needed) — used by frontend for price display.
 */
export async function GET() {
  try {
    const prices = await getAllPrices();
    const priceArray = Array.from(prices.values());

    return NextResponse.json({
      prices: priceArray,
      lastUpdated: priceArray[0]?.lastUpdated || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
