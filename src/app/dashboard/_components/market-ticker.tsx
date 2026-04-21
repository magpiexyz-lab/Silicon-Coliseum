"use client";

import { useEffect, useState } from "react";

interface PoolPrice {
  poolId: string;
  tokenA: string;
  tokenB: string;
  price: number;
}

export default function MarketTicker() {
  const [pools, setPools] = useState<PoolPrice[]>([]);

  useEffect(() => {
    function fetchPools() {
      fetch("/api/pools")
        .then((r) => r.json())
        .then((d) => {
          const items: PoolPrice[] = (d.pools || d || []).map(
            (p: {
              id: string;
              token_a_symbol?: string;
              token_b_symbol?: string;
              reserve_a: number;
              reserve_b: number;
            }) => ({
              poolId: p.id,
              tokenA: p.token_a_symbol || "???",
              tokenB: p.token_b_symbol || "???",
              price:
                p.reserve_a > 0 ? p.reserve_b / p.reserve_a : 0,
            })
          );
          setPools(items);
        })
        .catch(() => {});
    }

    fetchPools();
    const interval = setInterval(fetchPools, 60000);
    return () => clearInterval(interval);
  }, []);

  if (pools.length === 0) return null;

  const doubled = [...pools, ...pools];

  return (
    <div className="border-b border-border/20 bg-card/30 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap py-2">
        {doubled.map((pool, i) => (
          <div
            key={`${pool.poolId}-${i}`}
            className="inline-flex items-center gap-2 mx-6 text-xs"
          >
            <span className="font-semibold text-foreground">
              {pool.tokenA}/{pool.tokenB}
            </span>
            <span className="text-muted-foreground font-mono">
              {pool.price < 0.01
                ? pool.price.toFixed(6)
                : pool.price.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
