"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Coins,
  TrendingUp,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlatformToken, Pool } from "@/lib/types";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

type PoolWithPrice = Pool & { current_price?: number | null };

interface TokenWithPrices extends PlatformToken {
  prices: Array<{
    pair: string;
    price: number;
    poolId: string;
  }>;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [tokensRes, poolsRes] = await Promise.all([
          fetch("/api/tokens"),
          fetch("/api/pools"),
        ]);

        if (!tokensRes.ok) throw new Error("Failed to fetch tokens");

        const tokensData = await tokensRes.json();
        const rawTokens: PlatformToken[] = tokensData.tokens || [];

        let poolsList: PoolWithPrice[] = [];
        if (poolsRes.ok) {
          const poolsData = await poolsRes.json();
          poolsList = poolsData.pools || [];
        }

        // Build a map of token prices from pools
        const tokenPriceMap = new Map<
          string,
          Array<{ pair: string; price: number; poolId: string }>
        >();

        for (const pool of poolsList) {
          if (pool.current_price != null) {
            // Token A priced in Token B
            if (!tokenPriceMap.has(pool.token_a)) {
              tokenPriceMap.set(pool.token_a, []);
            }
            tokenPriceMap.get(pool.token_a)!.push({
              pair: `${pool.token_a_symbol || "?"}/${pool.token_b_symbol || "?"}`,
              price: pool.current_price,
              poolId: pool.id,
            });

            // Token B priced in Token A (inverse)
            if (!tokenPriceMap.has(pool.token_b)) {
              tokenPriceMap.set(pool.token_b, []);
            }
            tokenPriceMap.get(pool.token_b)!.push({
              pair: `${pool.token_b_symbol || "?"}/${pool.token_a_symbol || "?"}`,
              price: pool.current_price > 0 ? 1 / pool.current_price : 0,
              poolId: pool.id,
            });
          }
        }

        const enriched: TokenWithPrices[] = rawTokens.map((token) => ({
          ...token,
          prices: tokenPriceMap.get(token.id) || [],
        }));

        setTokens(enriched);
      } catch {
        setError("Failed to load tokens.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredTokens = tokens.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />

      {/* Header */}
      <header className="glass border-b border-border/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold gradient-text">Token Explorer</h1>
          </div>
          <Link href="/login">
            <Button size="sm">Launch App</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            <span className="shimmer-text">Platform Tokens</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Explore all virtual tokens available for arena trading. These tokens are traded through AMM pools within arenas.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-md mx-auto mb-8"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass border-border/30"
            />
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Token Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filteredTokens.map((token) => (
            <motion.div key={token.id} variants={fadeUp}>
              <Card className="glass border-border/30 glass-glow h-full group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      {token.image_url ? (
                        <img
                          src={token.image_url}
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <Coins className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {token.name}
                        <Badge variant="outline" className="font-mono text-primary border-primary/30 text-[10px] px-1.5">
                          {token.symbol}
                        </Badge>
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {token.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {token.description}
                    </p>
                  )}

                  {token.prices.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/20">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Current Prices
                      </p>
                      {token.prices.map((p) => (
                        <div
                          key={p.poolId}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground font-mono">
                            {p.pair}
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            {p.price.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {token.prices.length === 0 && (
                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/20">
                      No active pools for this token
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {filteredTokens.length === 0 && !loading && (
          <p className="text-muted-foreground text-center py-12">
            {searchQuery ? "No tokens match your search." : "No tokens available yet."}
          </p>
        )}
      </main>
    </div>
  );
}
