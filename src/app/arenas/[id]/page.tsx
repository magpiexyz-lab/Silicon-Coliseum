"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Swords,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Arena, ArenaPhase, LeaderboardEntry, Pool } from "@/lib/types";

const phaseColors: Record<ArenaPhase, string> = {
  prep: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  competition: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  challenge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rewards: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  closed: "bg-muted text-muted-foreground border-border/30",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-400",
  completed: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-destructive/20 text-destructive",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PoolWithPrice = Pool & { current_price?: number | null };

export default function ArenaDetailPage() {
  const params = useParams();
  const arenaId = params.id as string;

  const [arena, setArena] = useState<Arena | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pools, setPools] = useState<PoolWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!arenaId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [arenaRes, leaderboardRes, poolsRes] = await Promise.all([
          fetch(`/api/arenas/${arenaId}`),
          fetch(`/api/arenas/${arenaId}/leaderboard`),
          fetch(`/api/pools?arena_id=${arenaId}`),
        ]);

        if (!arenaRes.ok) {
          if (arenaRes.status === 404) throw new Error("Arena not found");
          throw new Error("Failed to fetch arena");
        }

        const arenaData = await arenaRes.json();
        setArena(arenaData.arena);
        setEntryCount(arenaData.entryCount || 0);

        if (leaderboardRes.ok) {
          const lbData = await leaderboardRes.json();
          setLeaderboard(lbData.leaderboard || []);
        }

        if (poolsRes.ok) {
          const poolsData = await poolsRes.json();
          setPools(poolsData.pools || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load arena");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [arenaId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading arena...</p>
        </div>
      </div>
    );
  }

  if (error || !arena) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 text-center space-y-4">
          <p className="text-destructive text-lg">{error || "Arena not found"}</p>
          <Link href="/arenas">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Arenas
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />

      {/* Header */}
      <header className="glass border-b border-border/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/arenas" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold gradient-text">{arena.name}</h1>
          </div>
          {arena.phase === "prep" && (
            <Link href="/login">
              <Button size="sm" className="gap-1.5">
                Join Arena
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Arena Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass border-border/30">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">{arena.name}</CardTitle>
                  {arena.description && (
                    <CardDescription className="mt-2 text-base">
                      {arena.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge className={statusColors[arena.status] || ""} variant="outline">
                    {arena.status}
                  </Badge>
                  <Badge className={phaseColors[arena.phase]}>{arena.phase}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass rounded-lg p-4 text-center">
                  <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">${arena.prize_pool.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Prize Pool</p>
                </div>
                <div className="glass rounded-lg p-4 text-center">
                  <Swords className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">${arena.starting_balance.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Starting Balance</p>
                </div>
                <div className="glass rounded-lg p-4 text-center">
                  <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{entryCount}</p>
                  <p className="text-xs text-muted-foreground">Entries</p>
                </div>
                <div className="glass rounded-lg p-4 text-center">
                  <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-sm font-medium">{formatDate(arena.competition_start)}</p>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                </div>
              </div>
              {arena.competition_end && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Competition ends: {formatDate(arena.competition_end)}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No entries yet. Be the first to join!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left p-3 text-muted-foreground font-medium">Rank</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">Agent</th>
                          <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Owner</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">P&L %</th>
                          <th className="text-right p-3 text-muted-foreground font-medium hidden sm:table-cell">Trades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry) => (
                          <tr
                            key={entry.agentId}
                            className="border-b border-border/20 last:border-0 hover:bg-card/50 transition-colors"
                          >
                            <td className="p-3">
                              <span
                                className={`font-bold ${medalColors[entry.rank - 1] || "text-muted-foreground"}`}
                              >
                                {entry.rank <= 3
                                  ? ["#1", "#2", "#3"][entry.rank - 1]
                                  : `#${entry.rank}`}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{entry.agentName}</span>
                                {entry.isNpc && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    NPC
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground hidden sm:table-cell">
                              {entry.ownerUsername}
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={`font-bold ${entry.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                              >
                                {entry.pnlPercent >= 0 ? "+" : ""}
                                {entry.pnlPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-right text-muted-foreground hidden sm:table-cell">
                              {entry.tradeCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pool Prices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Pool Prices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pools.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    No pools configured for this arena.
                  </p>
                ) : (
                  pools.map((pool) => (
                    <div
                      key={pool.id}
                      className="glass rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">
                          {pool.token_a_symbol || "?"}/{pool.token_b_symbol || "?"}
                        </span>
                        {pool.current_price != null && (
                          <span className="font-mono text-sm text-primary font-bold">
                            {pool.current_price.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Vol: {Number(pool.total_volume).toLocaleString()}</span>
                        <span>Fee: {(pool.fee_rate * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Join CTA */}
            {arena.phase === "prep" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4"
              >
                <Card className="glass border-primary/30 glass-glow">
                  <CardContent className="p-6 text-center space-y-3">
                    <Swords className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      This arena is accepting entries
                    </p>
                    <Link href="/login">
                      <Button className="w-full gap-1.5">
                        Join Arena
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
