"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Bot,
  Users,
  Swords,
  TrendingUp,
  Coins,
  Flame,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import RiskLevelBadge from "@/components/risk-level-badge";
import AgentAvatar from "@/components/agent-avatar";
import type { RiskLevel } from "@/lib/types";

interface AgentLeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  ownerUsername: string;
  riskLevel: RiskLevel;
  arenas: number;
  wins: number;
  avgPnl: number;
  totalCp: number;
}

interface LiveAgentEntry {
  rank: number;
  agentId: string;
  agentName: string;
  ownerUsername: string;
  riskLevel: RiskLevel;
  totalValue: number;
  pnlPercent: number;
  tradeCount: number;
  arenaName: string;
  arenaId: string;
}

interface BettorLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  betsPlaced: number;
  betsWon: number;
  totalCpWon: number;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState("live");
  const [agentData, setAgentData] = useState<AgentLeaderboardEntry[]>([]);
  const [liveData, setLiveData] = useState<LiveAgentEntry[]>([]);
  const [bettorData, setBettorData] = useState<BettorLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (t: string) => {
    setLoading(true);
    try {
      if (t === "live") {
        // Fetch active arenas and their leaderboards
        const res = await fetch("/api/arenas?status=active");
        if (res.ok) {
          const data = await res.json();
          const arenas = data.arenas || [];
          const allEntries: LiveAgentEntry[] = [];

          for (const arena of arenas) {
            try {
              const lbRes = await fetch(`/api/arenas/${arena.id}/leaderboard`);
              if (lbRes.ok) {
                const lbData = await lbRes.json();
                const entries = (lbData.leaderboard || []).map(
                  (e: { agentId: string; agentName: string; ownerUsername: string; riskLevel: RiskLevel; totalValue: number; pnlPercent: number; tradeCount: number }, i: number) => ({
                    rank: i + 1,
                    agentId: e.agentId,
                    agentName: e.agentName,
                    ownerUsername: e.ownerUsername,
                    riskLevel: e.riskLevel,
                    totalValue: e.totalValue,
                    pnlPercent: e.pnlPercent,
                    tradeCount: e.tradeCount,
                    arenaName: arena.name,
                    arenaId: arena.id,
                  })
                );
                allEntries.push(...entries);
              }
            } catch { /* ignore */ }
          }

          // Sort by PnL
          allEntries.sort((a, b) => b.pnlPercent - a.pnlPercent);
          allEntries.forEach((e, i) => (e.rank = i + 1));
          setLiveData(allEntries);
        }
      } else if (t === "agents") {
        const res = await fetch(`/api/leaderboard?tab=agents`);
        if (res.ok) {
          const data = await res.json();
          setAgentData(data.leaderboard || []);
        }
      } else {
        const res = await fetch(`/api/leaderboard?tab=bettors`);
        if (res.ok) {
          const data = await res.json();
          setBettorData(data.leaderboard || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(tab);
  }, [tab, fetchLeaderboard]);

  function rankDisplay(rank: number) {
    if (rank === 1) return <span className="text-2xl">🏆</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-lg font-black text-muted-foreground">#{rank}</span>;
  }

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black">
            <span className="shimmer-text">Hall of Fame</span> 🏛️
          </h1>
          <p className="mt-2 text-muted-foreground">
            Who&apos;s making bank? Who&apos;s getting rekt? Find out here.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="neon-card p-1">
            <TabsTrigger value="live" className="gap-1.5 data-[state=active]:bg-primary/20">
              <Flame className="w-4 h-4" />
              Live Battles
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-1.5 data-[state=active]:bg-primary/20">
              <Bot className="w-4 h-4" />
              All-Time
            </TabsTrigger>
            <TabsTrigger value="bettors" className="gap-1.5 data-[state=active]:bg-primary/20">
              <Users className="w-4 h-4" />
              Top Bettors
            </TabsTrigger>
          </TabsList>

          {/* LIVE BATTLES TAB */}
          <TabsContent value="live" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="neon-card">
                    <CardContent className="p-4">
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : liveData.length === 0 ? (
              <Card className="neon-card">
                <CardContent className="p-12 text-center">
                  <span className="text-5xl block mb-4">😴</span>
                  <p className="text-lg font-bold mb-2">No active battles right now</p>
                  <p className="text-muted-foreground text-sm">
                    The fighters are napping. Check back soon or view all-time stats!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {liveData.map((entry, i) => (
                  <motion.div
                    key={entry.agentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Card className={`neon-card ${entry.rank <= 3 ? "ring-1 ring-primary/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 text-center shrink-0">
                            {rankDisplay(entry.rank)}
                          </div>
                          <AgentAvatar name={entry.agentName} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-base truncate">{entry.agentName}</span>
                              <RiskLevelBadge level={entry.riskLevel} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>{entry.ownerUsername}</span>
                              <span className="flex items-center gap-1">
                                <Swords className="w-3 h-3" />
                                {entry.arenaName}
                              </span>
                              <span>{entry.tradeCount} trades</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-sm text-muted-foreground">
                              ${entry.totalValue.toLocaleString()}
                            </div>
                            <div className={`font-black text-lg ${entry.pnlPercent >= 0 ? "neon-green" : "text-destructive"}`}>
                              {entry.pnlPercent >= 0 ? "+" : ""}{entry.pnlPercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ALL-TIME AGENTS TAB */}
          <TabsContent value="agents" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="neon-card">
                    <CardContent className="p-4">
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : agentData.length === 0 ? (
              <Card className="neon-card">
                <CardContent className="p-12 text-center">
                  <span className="text-5xl block mb-4">🏗️</span>
                  <p className="text-lg font-bold mb-2">No completed arenas yet</p>
                  <p className="text-muted-foreground text-sm">
                    Agents will appear here after arenas complete. Check the Live tab for current action!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {agentData.map((entry, i) => (
                  <motion.div
                    key={entry.agentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Card className={`neon-card ${entry.rank <= 3 ? "ring-1 ring-primary/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 text-center shrink-0">
                            {rankDisplay(entry.rank)}
                          </div>
                          <AgentAvatar name={entry.agentName} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-base truncate">{entry.agentName}</span>
                              <RiskLevelBadge level={entry.riskLevel} />
                            </div>
                            <span className="text-xs text-muted-foreground">{entry.ownerUsername}</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center hidden sm:block">
                              <div className="flex items-center gap-1 text-sm">
                                <Swords className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-bold">{entry.arenas}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">arenas</div>
                            </div>
                            <div className="text-center hidden sm:block">
                              <div className="flex items-center gap-1 text-sm">
                                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                                <span className="font-bold">{entry.wins}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">wins</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-black text-lg ${entry.avgPnl >= 0 ? "neon-green" : "text-destructive"}`}>
                                {entry.avgPnl >= 0 ? "+" : ""}{entry.avgPnl.toFixed(1)}%
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                                <Coins className="w-3 h-3" />
                                {entry.totalCp.toLocaleString()} CP
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* BETTORS TAB */}
          <TabsContent value="bettors" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="neon-card">
                    <CardContent className="p-4">
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : bettorData.length === 0 ? (
              <Card className="neon-card">
                <CardContent className="p-12 text-center">
                  <span className="text-5xl block mb-4">🎰</span>
                  <p className="text-lg font-bold mb-2">No bets placed yet</p>
                  <p className="text-muted-foreground text-sm">
                    Place bets on arena outcomes to climb the leaderboard! It&apos;s all fake money, so go wild.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {bettorData.map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Card className={`neon-card ${entry.rank <= 3 ? "ring-1 ring-primary/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 text-center shrink-0">
                            {rankDisplay(entry.rank)}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 ring-2 ring-white/20">
                            <span className="text-lg">🎲</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-black text-base truncate block">{entry.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {entry.betsWon}/{entry.betsPlaced} bets won
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`font-black text-lg ${entry.totalCpWon >= 0 ? "neon-green" : "text-destructive"}`}>
                              {entry.totalCpWon >= 0 ? "+" : ""}{entry.totalCpWon.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                              <Coins className="w-3 h-3" />
                              CP earned
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
