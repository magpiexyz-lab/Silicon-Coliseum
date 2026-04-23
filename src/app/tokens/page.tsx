"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Coins, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tokens?include=prices");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mesh-gradient fixed inset-0 -z-10" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <h1 className="text-3xl font-bold shimmer-text">Platform Tokens</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass border-border/30">
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-40 mt-2" />
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

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold shimmer-text">Platform Tokens</h1>
          <p className="mt-2 text-muted-foreground">
            All virtual tokens available for trading in arenas
          </p>
        </div>

        {tokens.length === 0 ? (
          <Card className="glass border-border/30">
            <CardContent className="p-8 text-center">
              <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No tokens created yet. Admins can create tokens in the Admin panel.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token, i) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card className="glass border-border/30 glass-glow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="font-mono text-primary border-primary/30 text-base px-3"
                      >
                        {token.symbol}
                      </Badge>
                      {token.isBaseCurrency && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                          Base Currency
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{token.name}</CardTitle>
                    {token.description && (
                      <CardDescription className="line-clamp-2">
                        {token.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Prices across active arenas */}
                    {token.prices && token.prices.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Active Arena Prices
                        </p>
                        {token.prices.map((p, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between glass rounded-lg px-3 py-2"
                          >
                            <span className="text-sm text-muted-foreground truncate mr-2">
                              {p.arenaName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm">
                                ${p.price.toFixed(4)}
                              </span>
                              <span
                                className={`text-xs flex items-center gap-0.5 ${p.priceChange >= 0 ? "text-primary" : "text-destructive"}`}
                              >
                                {p.priceChange >= 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {p.priceChange >= 0 ? "+" : ""}
                                {p.priceChange.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recent trades */}
                    {token.recentTrades && token.recentTrades.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Recent Trades
                        </p>
                        {token.recentTrades.slice(0, 3).map((t, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between text-xs py-1"
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
                              <span className="text-muted-foreground">
                                {t.agentName}
                              </span>
                            </div>
                            <span className="font-mono text-muted-foreground">
                              ${t.price.toFixed(4)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!token.prices?.length && !token.recentTrades?.length && !token.isBaseCurrency && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Not trading in any active arena
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
