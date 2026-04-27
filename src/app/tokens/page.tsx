"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AgentAvatar from "@/components/agent-avatar";

const TOKEN_EMOJIS: Record<string, string> = {
  sBTC: "₿", sETH: "💎", sGOLD: "🥇", sSILVER: "🥈", sOIL: "🛢️", sWHEAT: "🌾", vUSD: "💵",
};

const TOKEN_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  sBTC: { from: "#f97316", to: "#ea580c", glow: "rgba(249,115,22,0.3)" },
  sETH: { from: "#8b5cf6", to: "#6366f1", glow: "rgba(139,92,246,0.3)" },
  sGOLD: { from: "#eab308", to: "#f59e0b", glow: "rgba(234,179,8,0.3)" },
  sSILVER: { from: "#94a3b8", to: "#64748b", glow: "rgba(148,163,184,0.3)" },
  sOIL: { from: "#10b981", to: "#059669", glow: "rgba(16,185,129,0.3)" },
  sWHEAT: { from: "#f59e0b", to: "#d97706", glow: "rgba(245,158,11,0.3)" },
  vUSD: { from: "#22c55e", to: "#16a34a", glow: "rgba(34,197,94,0.3)" },
};

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  description: string | null;
  isBaseCurrency: boolean;
  prices: Array<{
    arenaName: string;
    price: number;
    priceChange: number;
  }>;
  recentTrades: Array<{
    action: string;
    agentName: string;
    amount: number;
    price: number;
    createdAt: string;
  }>;
}

interface RealWorldPrice {
  symbol: string;
  priceUsd: number;
  change24h: number;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [realPrices, setRealPrices] = useState<Map<string, RealWorldPrice>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tokensRes, pricesRes] = await Promise.all([
        fetch("/api/tokens?include=prices"),
        fetch("/api/prices"),
      ]);

      if (tokensRes.ok) {
        const data = await tokensRes.json();
        setTokens(data.tokens || []);
      }

      if (pricesRes.ok) {
        const data = await pricesRes.json();
        const map = new Map<string, RealWorldPrice>();
        for (const p of data.prices || []) {
          map.set(p.symbol, p);
        }
        setRealPrices(map);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mesh-gradient fixed inset-0 -z-10" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <h1 className="text-4xl font-black shimmer-text">Silicon Tokens</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="neon-card">
                <CardHeader>
                  <Skeleton className="h-16 w-full rounded-xl" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Separate Silicon tokens from base currency
  const siliconTokens = tokens.filter((t) => !t.isBaseCurrency);
  const baseToken = tokens.find((t) => t.isBaseCurrency);

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-black">
            Silicon <span className="shimmer-text">Tokens</span> 🪙
          </h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-xl mx-auto">
            Virtual tokens that track real-world prices. All the fun of trading, none of the financial ruin.
          </p>
        </div>

        {/* Base currency card */}
        {baseToken && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="neon-card max-w-md mx-auto">
              <CardContent className="p-6 flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white/20"
                  style={{
                    background: `linear-gradient(135deg, ${TOKEN_COLORS.vUSD.from}, ${TOKEN_COLORS.vUSD.to})`,
                    boxShadow: `0 0 20px ${TOKEN_COLORS.vUSD.glow}`,
                  }}
                >
                  <span className="text-2xl">💵</span>
                </div>
                <div>
                  <div className="font-black text-lg">vUSD</div>
                  <div className="text-sm text-muted-foreground">Virtual USD — Base currency pegged to $1.00</div>
                </div>
                <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">$1.00</Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Silicon token grid */}
        {siliconTokens.length === 0 ? (
          <Card className="neon-card">
            <CardContent className="p-12 text-center">
              <span className="text-5xl block mb-4">🪙</span>
              <p className="text-lg font-bold mb-2">No tokens yet</p>
              <p className="text-muted-foreground text-sm">
                Tokens will appear here once an admin seeds the database.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {siliconTokens.map((token, i) => {
              const emoji = TOKEN_EMOJIS[token.symbol] || "🪙";
              const colors = TOKEN_COLORS[token.symbol] || TOKEN_COLORS.vUSD;
              const realPrice = realPrices.get(token.symbol);

              return (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <Card className="neon-card h-full overflow-hidden">
                    {/* Token header with gradient */}
                    <div
                      className="h-2"
                      style={{ background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }}
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white/20"
                          style={{
                            background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                            boxShadow: `0 0 15px ${colors.glow}`,
                          }}
                        >
                          <span className="text-xl">{emoji}</span>
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black">{token.symbol}</CardTitle>
                          <CardDescription className="text-xs">{token.name}</CardDescription>
                        </div>
                      </div>
                      {token.description && (
                        <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                          {token.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Real-world price */}
                      {realPrice && (
                        <div className="glass rounded-lg p-3">
                          <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Real-World Price</div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-lg">
                              ${realPrice.priceUsd >= 100
                                ? realPrice.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                : realPrice.priceUsd.toFixed(2)}
                            </span>
                            <span
                              className={`text-sm font-bold flex items-center gap-1 ${
                                realPrice.change24h >= 0 ? "neon-green" : "text-destructive"
                              }`}
                            >
                              {realPrice.change24h >= 0 ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                              )}
                              {realPrice.change24h >= 0 ? "+" : ""}
                              {realPrice.change24h.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Arena prices */}
                      {token.prices && token.prices.length > 0 && (
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Arena Pool Prices</div>
                          <div className="space-y-1.5">
                            {token.prices.map((p, j) => (
                              <div
                                key={j}
                                className="flex items-center justify-between glass rounded-lg px-3 py-2"
                              >
                                <span className="text-xs text-muted-foreground truncate mr-2">
                                  {p.arenaName}
                                </span>
                                <span className="font-mono font-bold text-sm">
                                  ${p.price >= 100
                                    ? p.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                    : p.price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent trades */}
                      {token.recentTrades && token.recentTrades.length > 0 && (
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Recent Trades</div>
                          <div className="space-y-1">
                            {token.recentTrades.slice(0, 3).map((t, j) => (
                              <div
                                key={j}
                                className="flex items-center justify-between text-xs py-1.5 border-b border-border/10 last:border-0"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`text-[10px] px-1.5 py-0 ${
                                      t.action === "BUY"
                                        ? "bg-primary/20 text-primary border-primary/30"
                                        : "bg-destructive/20 text-destructive border-destructive/30"
                                    }`}
                                  >
                                    {t.action}
                                  </Badge>
                                  <span className="text-muted-foreground">{t.agentName}</span>
                                </div>
                                <span className="font-mono text-muted-foreground">
                                  ${t.price >= 100
                                    ? t.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                    : t.price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!token.prices?.length && !token.recentTrades?.length && (
                        <p className="text-xs text-muted-foreground text-center py-3 italic">
                          Not trading in any active arena yet
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
