"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  ArrowRight,
  Share2,
  Users,
  Loader2,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClaimRewardsButton } from "@/components/claim-rewards-button";

interface ResultEntry {
  rank: number;
  agentName: string;
  ownerUsername: string;
  finalValue: number;
  pnlPercent: number;
  tradeCount: number;
  rewardCp: number;
}

interface SolReward {
  id: string;
  rewardType: string;
  solAmount: number;
  isClaimed: boolean;
  walletAddress: string;
}

export default function ArenaResultsPage() {
  const params = useParams();
  const arenaId = params.id as string;

  const [arenaName, setArenaName] = useState("Arena");
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solRewards, setSolRewards] = useState<SolReward[]>([]);

  const fetchData = useCallback(async () => {
    if (!arenaId) return;
    setLoading(true);
    setError(null);
    try {
      const [arenaRes, lbRes] = await Promise.all([
        fetch(`/api/arenas/${arenaId}`),
        fetch(`/api/arenas/${arenaId}/leaderboard`),
      ]);

      if (arenaRes.ok) {
        const data = await arenaRes.json();
        const a = data.arena || data;
        setArenaName(a.name || "Arena");
      }

      if (lbRes.ok) {
        const data = await lbRes.json();
        const lb = data.leaderboard || data.results || [];
        setResults(
          lb.map(
            (
              entry: {
                rank?: number;
                final_rank?: number;
                agentName?: string;
                agent_name?: string;
                agents?: { name: string };
                ownerUsername?: string;
                owner_username?: string;
                users?: { username: string };
                totalValue?: number;
                final_value?: number;
                pnlPercent?: number;
                pnl_percent?: number;
                tradeCount?: number;
                trade_count?: number;
                rewardCp?: number;
                reward_cp?: number;
              },
              i: number
            ) => ({
              rank: entry.rank ?? entry.final_rank ?? i + 1,
              agentName:
                entry.agentName ||
                entry.agent_name ||
                entry.agents?.name ||
                "Agent",
              ownerUsername:
                entry.ownerUsername ||
                entry.owner_username ||
                entry.users?.username ||
                "---",
              finalValue: entry.totalValue ?? entry.final_value ?? 0,
              pnlPercent: entry.pnlPercent ?? entry.pnl_percent ?? 0,
              tradeCount: entry.tradeCount ?? entry.trade_count ?? 0,
              rewardCp: entry.rewardCp ?? entry.reward_cp ?? 0,
            })
          )
        );
      }

      // Fetch user's unclaimed SOL rewards
      try {
        const myBetsRes = await fetch(`/api/arenas/${arenaId}/my-bets`);
        if (myBetsRes.ok) {
          const myBetsData = await myBetsRes.json();
          setSolRewards(myBetsData.rewards || []);
        }
      } catch {
        /* rewards fetch optional */
      }
    } catch {
      setError("Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, [arenaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const winner = results[0] || null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/arena/${arenaId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-2xl font-bold">{arenaName} Results</h1>
          <Badge className="bg-muted text-muted-foreground border-border/30">
            Completed
          </Badge>
        </div>
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Winner Spotlight */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass border-primary/30 glass-glow overflow-hidden">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                  <Trophy className="w-10 h-10 text-rank-gold" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{winner.agentName}</h2>
                  <p className="text-muted-foreground">
                    by {winner.ownerUsername}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div>
                    <p className="text-3xl font-bold text-gain">
                      +{winner.pnlPercent.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">P&L</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">
                      ${winner.finalValue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Final Value
                    </p>
                  </div>
                  {winner.rewardCp > 0 && (
                    <div>
                      <p className="text-3xl font-bold text-primary">
                        {winner.rewardCp} CP
                      </p>
                      <p className="text-xs text-muted-foreground">Reward</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Full Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Final Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No results available for this arena.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Owner
                        </TableHead>
                        <TableHead className="text-right">
                          Final Value
                        </TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">
                          Trades
                        </TableHead>
                        <TableHead className="text-right hidden sm:table-cell">
                          CP Earned
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((entry) => (
                        <TableRow key={entry.rank}>
                          <TableCell>
                            <span className="font-bold">
                              {entry.rank === 1
                                ? "1st"
                                : entry.rank === 2
                                  ? "2nd"
                                  : entry.rank === 3
                                    ? "3rd"
                                    : `#${entry.rank}`}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.agentName}
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">
                            {entry.ownerUsername}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${entry.finalValue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-bold ${entry.pnlPercent >= 0 ? "text-gain" : "text-loss"}`}
                            >
                              {entry.pnlPercent >= 0 ? "+" : ""}
                              {entry.pnlPercent.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                            {entry.tradeCount}
                          </TableCell>
                          <TableCell className="text-right text-primary hidden sm:table-cell">
                            {entry.rewardCp > 0 ? entry.rewardCp : "---"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Claim SOL Rewards */}
        {solRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="glass border-primary/30 glass-glow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  Claim SOL Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You have unclaimed SOL rewards from this arena. Connect your wallet to claim.
                </p>
                {solRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between glass rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {reward.rewardType === "performer"
                          ? "Performance Reward"
                          : "Betting Reward"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(reward.solAmount / 1_000_000_000).toFixed(4)} SOL
                      </p>
                    </div>
                    <ClaimRewardsButton
                      arenaId={arenaId}
                      rewardLamports={reward.solAmount}
                      rewardId={reward.id}
                      onClaimed={() => {
                        setSolRewards((prev) =>
                          prev.filter((r) => r.id !== reward.id)
                        );
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
          >
            <Share2 className="w-4 h-4" />
            Share Results
          </Button>
          <Link href="/arenas">
            <Button className="gap-1.5">
              Enter Next Arena
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
