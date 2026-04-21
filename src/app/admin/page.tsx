"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Coins,
  Droplets,
  Swords,
  Plus,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Play,
  SkipForward,
  Square,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlatformToken, Arena, Pool, ArenaPhase } from "@/lib/types";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const phaseColors: Record<ArenaPhase, string> = {
  prep: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  competition: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  challenge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rewards: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  closed: "bg-muted text-muted-foreground border-border/30",
};

const phaseOrder: ArenaPhase[] = ["prep", "competition", "challenge", "rewards", "closed"];

function getNextPhase(current: ArenaPhase): ArenaPhase | null {
  const idx = phaseOrder.indexOf(current);
  if (idx < 0 || idx >= phaseOrder.length - 1) return null;
  return phaseOrder[idx + 1];
}

export default function AdminPage() {
  const [tokens, setTokens] = useState<PlatformToken[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [pools, setPools] = useState<(Pool & { current_price?: number | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Token form
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [tokenSubmitting, setTokenSubmitting] = useState(false);

  // Arena form
  const [arenaName, setArenaName] = useState("");
  const [arenaDescription, setArenaDescription] = useState("");
  const [arenaSubmitting, setArenaSubmitting] = useState(false);

  // Pool form
  const [poolArenaId, setPoolArenaId] = useState("");
  const [poolTokenA, setPoolTokenA] = useState("");
  const [poolTokenB, setPoolTokenB] = useState("");
  const [poolReserveA, setPoolReserveA] = useState("1000000");
  const [poolReserveB, setPoolReserveB] = useState("1000000");
  const [poolSubmitting, setPoolSubmitting] = useState(false);

  const [phaseTransitioning, setPhaseTransitioning] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tokensRes, arenasRes, poolsRes] = await Promise.all([
        fetch("/api/admin/tokens"),
        fetch("/api/admin/arenas"),
        fetch("/api/pools"),
      ]);

      if (!tokensRes.ok || !arenasRes.ok || !poolsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [tokensData, arenasData, poolsData] = await Promise.all([
        tokensRes.json(),
        arenasRes.json(),
        poolsRes.json(),
      ]);

      setTokens(tokensData.tokens || []);
      setArenas(arenasData.arenas || []);
      setPools(poolsData.pools || []);
    } catch {
      setError("Failed to load admin data. Make sure you are logged in as an admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    setTokenSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: tokenSymbol.toUpperCase(),
          name: tokenName,
          description: tokenDescription || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create token");
      }
      setTokenSymbol("");
      setTokenName("");
      setTokenDescription("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setTokenSubmitting(false);
    }
  }

  async function handleCreateArena(e: React.FormEvent) {
    e.preventDefault();
    setArenaSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/arenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: arenaName,
          description: arenaDescription || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create arena");
      }
      setArenaName("");
      setArenaDescription("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create arena");
    } finally {
      setArenaSubmitting(false);
    }
  }

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    setPoolSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arena_id: poolArenaId,
          token_a: poolTokenA,
          token_b: poolTokenB,
          reserve_a: parseFloat(poolReserveA),
          reserve_b: parseFloat(poolReserveB),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create pool");
      }
      setPoolArenaId("");
      setPoolTokenA("");
      setPoolTokenB("");
      setPoolReserveA("1000000");
      setPoolReserveB("1000000");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pool");
    } finally {
      setPoolSubmitting(false);
    }
  }

  async function handlePhaseTransition(arenaId: string, nextPhase: ArenaPhase) {
    setPhaseTransitioning(arenaId);
    setError(null);
    try {
      const res = await fetch("/api/admin/arenas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: arenaId, phase: nextPhase }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to transition phase");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transition phase");
    } finally {
      setPhaseTransitioning(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
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
            <h1 className="text-lg font-bold gradient-text">Admin Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <Tabs defaultValue="tokens" className="space-y-6">
          <TabsList className="glass border border-border/30">
            <TabsTrigger value="tokens" className="gap-1.5">
              <Coins className="w-4 h-4" />
              Tokens ({tokens.length})
            </TabsTrigger>
            <TabsTrigger value="pools" className="gap-1.5">
              <Droplets className="w-4 h-4" />
              Pools ({pools.length})
            </TabsTrigger>
            <TabsTrigger value="arenas" className="gap-1.5">
              <Swords className="w-4 h-4" />
              Arenas ({arenas.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Tokens Tab ── */}
          <TabsContent value="tokens" className="space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <Card className="glass border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Token
                  </CardTitle>
                  <CardDescription>Add a new platform token for arena trading</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateToken} className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Symbol (e.g. DOGE)"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      required
                      className="sm:w-32"
                    />
                    <Input
                      placeholder="Name (e.g. Dogecoin)"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      required
                      className="sm:w-48"
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={tokenDescription}
                      onChange={(e) => setTokenDescription(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={tokenSubmitting}>
                      {tokenSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map((token, i) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="glass border-border/30 glass-glow h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-primary border-primary/30">
                          {token.symbol}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(token.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-sm mt-2">{token.name}</CardTitle>
                    </CardHeader>
                    {token.description && (
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {token.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))}
              {tokens.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No tokens yet. Create one above.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── Pools Tab ── */}
          <TabsContent value="pools" className="space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <Card className="glass border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Pool
                  </CardTitle>
                  <CardDescription>Create an AMM pool for a token pair in an arena</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePool} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <Select value={poolArenaId} onValueChange={setPoolArenaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Arena" />
                      </SelectTrigger>
                      <SelectContent>
                        {arenas.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={poolTokenA} onValueChange={setPoolTokenA}>
                      <SelectTrigger>
                        <SelectValue placeholder="Token A" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={poolTokenB} onValueChange={setPoolTokenB}>
                      <SelectTrigger>
                        <SelectValue placeholder="Token B" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Reserve A"
                      value={poolReserveA}
                      onChange={(e) => setPoolReserveA(e.target.value)}
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Reserve B"
                      value={poolReserveB}
                      onChange={(e) => setPoolReserveB(e.target.value)}
                      required
                    />
                    <Button type="submit" disabled={poolSubmitting || !poolArenaId || !poolTokenA || !poolTokenB}>
                      {poolSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pools.map((pool, i) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="glass border-border/30 glass-glow h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-mono">
                          {pool.token_a_symbol || "?"}/{pool.token_b_symbol || "?"}
                        </CardTitle>
                        {pool.current_price != null && (
                          <Badge variant="outline" className="font-mono">
                            {pool.current_price.toFixed(4)}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs text-muted-foreground">
                      <p>Reserve A: {Number(pool.reserve_a).toLocaleString()}</p>
                      <p>Reserve B: {Number(pool.reserve_b).toLocaleString()}</p>
                      <p>Volume: {Number(pool.total_volume).toLocaleString()}</p>
                      <p>Fee: {(pool.fee_rate * 100).toFixed(2)}%</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {pools.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No pools yet. Create one above.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── Arenas Tab ── */}
          <TabsContent value="arenas" className="space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <Card className="glass border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Arena
                  </CardTitle>
                  <CardDescription>Create a new competition arena</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateArena} className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Arena Name"
                      value={arenaName}
                      onChange={(e) => setArenaName(e.target.value)}
                      required
                      className="sm:w-64"
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={arenaDescription}
                      onChange={(e) => setArenaDescription(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={arenaSubmitting}>
                      {arenaSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {arenas.map((arena, i) => {
                const nextPhase = getNextPhase(arena.phase);
                return (
                  <motion.div
                    key={arena.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="glass border-border/30 glass-glow h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{arena.name}</CardTitle>
                          <div className="flex gap-1.5 shrink-0">
                            <Badge variant="outline">{arena.status}</Badge>
                            <Badge className={phaseColors[arena.phase]}>{arena.phase}</Badge>
                          </div>
                        </div>
                        {arena.description && (
                          <CardDescription className="line-clamp-2">
                            {arena.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <p>Prize Pool: ${arena.prize_pool.toLocaleString()}</p>
                          <p>Entry Fee: ${arena.entry_fee.toLocaleString()}</p>
                          <p>Starting Balance: ${arena.starting_balance.toLocaleString()}</p>
                          <p>Max Agents/User: {arena.max_agents_per_user}</p>
                        </div>
                        {nextPhase && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1.5"
                            disabled={phaseTransitioning === arena.id}
                            onClick={() => handlePhaseTransition(arena.id, nextPhase)}
                          >
                            {phaseTransitioning === arena.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : nextPhase === "competition" ? (
                              <Play className="w-3.5 h-3.5" />
                            ) : nextPhase === "closed" ? (
                              <Square className="w-3.5 h-3.5" />
                            ) : (
                              <SkipForward className="w-3.5 h-3.5" />
                            )}
                            Transition to {nextPhase}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {arenas.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No arenas yet. Create one above.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
