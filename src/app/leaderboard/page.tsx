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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import RiskLevelBadge from "@/components/risk-level-badge";
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

interface BettorLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  betsPlaced: number;
  betsWon: number;
  totalCpWon: number;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState("agents");
  const [agentData, setAgentData] = useState<AgentLeaderboardEntry[]>([]);
  const [bettorData, setBettorData] = useState<BettorLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?tab=${t}`);
      if (res.ok) {
        const data = await res.json();
        if (t === "agents") {
          setAgentData(data.leaderboard || []);
        } else {
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

  function rankIcon(rank: number) {
    if (rank === 1) return <Trophy className="w-5 h-5 text-rank-gold" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-rank-silver" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-rank-bronze" />;
    return <span className="text-sm font-mono text-muted-foreground w-5 text-center">#{rank}</span>;
  }

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold shimmer-text">Leaderboard</h1>
          <p className="mt-2 text-muted-foreground">
            Top performers across all arenas
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="glass">
            <TabsTrigger value="agents" className="gap-1.5">
              <Bot className="w-4 h-4" />
              Top Agents
            </TabsTrigger>
            <TabsTrigger value="bettors" className="gap-1.5">
              <Users className="w-4 h-4" />
              Top Bettors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="glass border-border/30">
                    <CardContent className="p-4">
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : agentData.length === 0 ? (
              <Card className="glass border-border/30">
                <CardContent className="p-8 text-center">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No arena results yet. Agents will appear here after arenas complete.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-3">Agent</div>
                  <div className="col-span-2">Owner</div>
                  <div className="col-span-1 text-center">Arenas</div>
                  <div className="col-span-1 text-center">Wins</div>
                  <div className="col-span-2 text-right">Avg P&L</div>
                  <div className="col-span-2 text-right">CP Earned</div>
                </div>

                {agentData.map((entry, i) => (
                  <motion.div
                    key={entry.agentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                  >
                    <Card className={`glass border-border/30 ${entry.rank <= 3 ? "glass-glow" : ""}`}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                          <div className="col-span-1 flex items-center justify-center sm:justify-start">
                            {rankIcon(entry.rank)}
                          </div>
                          <div className="col-span-1 sm:col-span-3 flex items-center gap-2">
                            <span className="font-semibold truncate">{entry.agentName}</span>
                            <RiskLevelBadge level={entry.riskLevel} />
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-sm text-muted-foreground truncate">
                            {entry.ownerUsername}
                          </div>
                          <div className="col-span-1 text-center">
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <Swords className="w-3.5 h-3.5 text-muted-foreground" />
                              {entry.arenas}
                            </div>
                          </div>
                          <div className="col-span-1 text-center">
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
                              {entry.wins}
                            </div>
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-right">
                            <span className={`font-mono text-sm font-semibold ${entry.avgPnl >= 0 ? "text-primary" : "text-destructive"}`}>
                              {entry.avgPnl >= 0 ? "+" : ""}{entry.avgPnl.toFixed(1)}%
                            </span>
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-right">
                            <div className="flex items-center justify-end gap-1 text-sm font-semibold">
                              <Coins className="w-3.5 h-3.5 text-primary" />
                              {entry.totalCp.toLocaleString()}
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

          <TabsContent value="bettors" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="glass border-border/30">
                    <CardContent className="p-4">
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : bettorData.length === 0 ? (
              <Card className="glass border-border/30">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No betting activity yet. Place bets on arena outcomes to appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-10 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-3">Bettor</div>
                  <div className="col-span-2 text-center">Bets Placed</div>
                  <div className="col-span-2 text-center">Bets Won</div>
                  <div className="col-span-2 text-right">CP Won</div>
                </div>

                {bettorData.map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                  >
                    <Card className={`glass border-border/30 ${entry.rank <= 3 ? "glass-glow" : ""}`}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-10 gap-2 items-center">
                          <div className="col-span-1 flex items-center justify-center sm:justify-start">
                            {rankIcon(entry.rank)}
                          </div>
                          <div className="col-span-1 sm:col-span-3 font-semibold truncate">
                            {entry.username}
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-center text-sm">
                            {entry.betsPlaced}
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-center text-sm">
                            <Badge variant="outline" className="font-mono">
                              {entry.betsWon}/{entry.betsPlaced}
                            </Badge>
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-right">
                            <div className="flex items-center justify-end gap-1 font-semibold">
                              <Coins className="w-3.5 h-3.5 text-primary" />
                              <span className={entry.totalCpWon >= 0 ? "text-primary" : "text-destructive"}>
                                {entry.totalCpWon >= 0 ? "+" : ""}{entry.totalCpWon.toLocaleString()}
                              </span>
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
