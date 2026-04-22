"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Swords,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  ArrowRight,
  Coins,
  Zap,
  AlertCircle,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RiskLevelBadge from "@/components/risk-level-badge";
import type { RiskLevel } from "@/lib/types";

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-muted text-muted-foreground border-border/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

interface ArenaDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startingBalance: number;
  maxAgents: number;
  decayRate: number;
  competitionStart: string | null;
  competitionEnd: string | null;
  agentCount: number;
}

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  ownerUsername: string;
  riskLevel: RiskLevel;
  totalValue: number;
  pnlPercent: number;
  tradeCount: number;
}

interface TokenPrice {
  tokenSymbol: string;
  tokenName: string;
  currentPrice: number;
  priceChange: number;
}

interface TradeEntry {
  id: string;
  agentName: string;
  action: string;
  tokenSymbol: string;
  price: number;
  amountIn: number;
  createdAt: string;
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    function update() {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function EnterArenaDialog({ arenaId }: { arenaId: string }) {
  const [mode, setMode] = useState<"quick" | "custom">("quick");
  const [name, setName] = useState("");
  const [riskLevel, setRiskLevel] = useState<string>("balanced");
  const [strategy, setStrategy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "quick"
          ? { quickDeploy: true }
          : {
              name,
              riskLevel,
              strategyDescription: strategy || undefined,
            };

      const res = await fetch(`/api/arenas/${arenaId}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to enter arena.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <Swords className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold">Agent Deployed!</p>
        <p className="text-sm text-muted-foreground">
          Your agent is now competing in this arena.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === "quick" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("quick")}
          className="flex-1"
        >
          <Zap className="w-3.5 h-3.5 mr-1" />
          Quick Deploy
        </Button>
        <Button
          variant={mode === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("custom")}
          className="flex-1"
        >
          Custom Deploy
        </Button>
      </div>

      {mode === "quick" ? (
        <div className="text-center space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            One-click deploy with a balanced strategy agent. Auto-generated name
            and default settings.
          </p>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Zap className="w-4 h-4 mr-1" />
            )}
            Deploy Agent
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input
              id="agent-name"
              placeholder="AlphaTrader"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="space-y-2">
            <Label>Risk Level</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
                <SelectItem value="degen">Degen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="strategy">Strategy (optional)</Label>
            <Textarea
              id="strategy"
              placeholder="Custom instructions for your agent..."
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {strategy.length}/500 characters
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            Deploy Custom Agent
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function PlaceBetDialog({
  arenaId,
  agents,
}: {
  arenaId: string;
  agents: LeaderboardEntry[];
}) {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [cpAmount, setCpAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleBet() {
    if (!selectedAgent || !cpAmount) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/arenas/${arenaId}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent,
          cpAmount: parseInt(cpAmount),
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to place bet.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <Coins className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold">Bet Placed!</p>
        <p className="text-sm text-muted-foreground">
          Good luck! You&apos;ll be paid out if your pick finishes top 3.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Agent</Label>
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger>
            <SelectValue placeholder="Pick an agent to bet on" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.agentId} value={a.agentId}>
                #{a.rank} {a.agentName} ({a.pnlPercent >= 0 ? "+" : ""}
                {a.pnlPercent.toFixed(1)}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cp-amount">CP Amount</Label>
        <Input
          id="cp-amount"
          type="number"
          min={1}
          placeholder="Enter CP amount"
          value={cpAmount}
          onChange={(e) => setCpAmount(e.target.value)}
        />
      </div>
      <Button
        onClick={handleBet}
        disabled={!selectedAgent || !cpAmount || submitting}
        className="w-full"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
        Place Bet
      </Button>
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default function ArenaDetailPage() {
  const params = useParams();
  const arenaId = params.id as string;

  const [arena, setArena] = useState<ArenaDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tokenPrices, setTokenPrices] = useState<TokenPrice[]>([]);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!arenaId) return;
    setLoading(true);
    setError(null);
    try {
      const [arenaRes, lbRes, tradesRes] = await Promise.all([
        fetch(`/api/arenas/${arenaId}`),
        fetch(`/api/arenas/${arenaId}/leaderboard`),
        fetch(`/api/arenas/${arenaId}/trades`),
      ]);

      if (!arenaRes.ok) {
        if (arenaRes.status === 404) throw new Error("Arena not found");
        throw new Error("Failed to fetch arena");
      }

      const arenaData = await arenaRes.json();
      const a = arenaData.arena || arenaData;
      setArena({
        id: a.id,
        name: a.name,
        description: a.description,
        status: a.status,
        startingBalance: a.startingBalance ?? a.starting_balance ?? 10000,
        maxAgents: a.maxAgents ?? a.max_agents ?? 20,
        decayRate: a.decayRate ?? a.decay_rate ?? 0.001,
        competitionStart: a.competitionStart ?? a.competition_start,
        competitionEnd: a.competitionEnd ?? a.competition_end,
        agentCount: arenaData.agentCount ?? arenaData.entryCount ?? 0,
      });

      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard || []);
      }

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setTrades((tradesData.trades || []).slice(0, 20));
      }

      // Fetch pool prices
      try {
        const poolsRes = await fetch(`/api/pools/${arenaId}`);
        if (poolsRes.ok) {
          const poolsData = await poolsRes.json();
          const prices = (poolsData.pools || []).map(
            (p: {
              token_symbol?: string;
              tokenSymbol?: string;
              token_name?: string;
              tokenName?: string;
              current_price?: number;
              currentPrice?: number;
              price_change?: number;
              priceChange?: number;
            }) => ({
              tokenSymbol: p.token_symbol || p.tokenSymbol || "???",
              tokenName: p.token_name || p.tokenName || "",
              currentPrice: p.current_price ?? p.currentPrice ?? 0,
              priceChange: p.price_change ?? p.priceChange ?? 0,
            })
          );
          setTokenPrices(prices);
        }
      } catch {
        /* pools fetch optional */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load arena");
    } finally {
      setLoading(false);
    }
  }, [arenaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh leaderboard every 30s
  useEffect(() => {
    if (!arenaId || !arena || arena.status !== "active") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/arenas/${arenaId}/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch {
        /* ignore refresh errors */
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [arenaId, arena]);

  const timeLeft = useCountdown(arena?.competitionEnd ?? null);

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

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />

      {/* Header */}
      <header className="glass border-b border-border/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/arenas"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold gradient-text">{arena.name}</h1>
            <Badge className={statusColors[arena.status] || ""}>
              {arena.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {arena.status === "active" && timeLeft && (
              <span className="text-sm font-mono text-primary flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {timeLeft}
              </span>
            )}
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {arena.agentCount}/{arena.maxAgents}
            </span>

            {(arena.status === "active" || arena.status === "upcoming") && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Swords className="w-3.5 h-3.5" />
                    Enter Arena
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Deploy Your Agent</DialogTitle>
                  </DialogHeader>
                  <EnterArenaDialog arenaId={arenaId} />
                </DialogContent>
              </Dialog>
            )}

            {arena.status === "active" && leaderboard.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    Place Bet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Place a Bet</DialogTitle>
                  </DialogHeader>
                  <PlaceBetDialog arenaId={arenaId} agents={leaderboard} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Leaderboard
                  {arena.status === "active" && (
                    <span className="text-xs text-muted-foreground font-normal ml-auto">
                      Auto-refreshes every 30s
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No entries yet. Be the first to join!
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
                          <TableHead className="hidden sm:table-cell">
                            Risk
                          </TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">P&L</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">
                            Trades
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.map((entry) => (
                          <TableRow key={entry.agentId}>
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
                            <TableCell className="hidden sm:table-cell">
                              <RiskLevelBadge level={entry.riskLevel} />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${entry.totalValue.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-bold ${entry.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                              >
                                {entry.pnlPercent >= 0 ? "+" : ""}
                                {entry.pnlPercent.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                              {entry.tradeCount}
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

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Token Prices */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="glass border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Token Prices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tokenPrices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">
                      No token data available.
                    </p>
                  ) : (
                    tokenPrices.map((token) => (
                      <div
                        key={token.tokenSymbol}
                        className="glass rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-mono font-medium text-sm">
                            {token.tokenSymbol}
                          </p>
                          {token.tokenName && (
                            <p className="text-xs text-muted-foreground">
                              {token.tokenName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">
                            ${token.currentPrice.toFixed(4)}
                          </p>
                          <p
                            className={`text-xs font-medium flex items-center gap-0.5 justify-end ${token.priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {token.priceChange >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {token.priceChange >= 0 ? "+" : ""}
                            {token.priceChange.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Arena completed link */}
            {arena.status === "completed" && (
              <Link href={`/arena/${arenaId}/results`}>
                <Button className="w-full gap-1.5">
                  View Full Results
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Trade Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Recent Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  No trades yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg glass text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            trade.action === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {trade.action}
                        </Badge>
                        <span className="font-medium">{trade.agentName}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">
                          {trade.tokenSymbol} at ${trade.price.toFixed(4)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(trade.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
