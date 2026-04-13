"use client";

import { useEffect, useState } from "react";
import type { MarketData } from "@/lib/types";

export default function MarketTicker() {
  const [prices, setPrices] = useState<Record<string, MarketData>>({});

  useEffect(() => {
    fetch("/api/tokens/prices")
      .then((r) => r.json())
      .then((d) => setPrices(d.prices || d || {}))
      .catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/tokens/prices")
        .then((r) => r.json())
        .then((d) => setPrices(d.prices || d || {}))
        .catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const tokens = Object.values(prices);
  if (tokens.length === 0) return null;

  const doubled = [...tokens, ...tokens];

  return (
    <div className="border-b border-border/20 bg-card/30 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap py-2">
        {doubled.map((token, i) => (
          <div
            key={`${token.symbol}-${i}`}
            className="inline-flex items-center gap-2 mx-6 text-xs"
          >
            <span className="font-semibold text-foreground">
              {token.symbol}
            </span>
            <span className="text-muted-foreground">
              ${token.price < 0.01 ? token.price.toFixed(6) : token.price.toFixed(4)}
            </span>
            <span
              className={
                token.priceChange24h >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            >
              {token.priceChange24h >= 0 ? "+" : ""}
              {token.priceChange24h?.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
