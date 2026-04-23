"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Coins,
  Swords,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Users,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

import { statusColors } from "@/lib/status-colors";

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ArenaData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  starting_balance: number;
  max_agents: number;
  decay_rate: number;
  competition_start: string | null;
  competition_end: string | null;
  agentCount?: number;
}

interface PoolConfig {
  tokenId: string;
  reserveToken: string;
  reserveBase: string;
}

export default function AdminPage() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [arenas, setArenas] = useState<ArenaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);

  // Token form
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [tokenSubmitting, setTokenSubmitting] = useState(false);

  // Arena form
  const [arenaName, setArenaName] = useState("");
  const [arenaDescription, setArenaDescription] = useState("");
  const [startingBalance, setStartingBalance] = useState("10000");
  const [maxAgents, setMaxAgents] = useState("20");
  const [decayRate, setDecayRate] = useState("0.001");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [poolConfigs, setPoolConfigs] = useState<PoolConfig[]>([]);
  const [arenaSubmitting, setArenaSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tokensRes, arenasRes] = await Promise.all([
        fetch("/api/tokens"),
        fetch("/api/arenas"),
      ]);

      if (tokensRes.status === 401 || arenasRes.status === 401) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (tokensRes.ok) {
        const data = await tokensRes.json();
        setTokens(data.tokens || []);
      }

      if (arenasRes.ok) {
        const data = await arenasRes.json();
        setArenas(data.arenas || []);
      }
    } catch {
      setError("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleToken(tokenId: string) {
    setSelectedTokens((prev) => {
      const next = prev.includes(tokenId)
        ? prev.filter((id) => id !== tokenId)
        : [...prev, tokenId];

      // Update pool configs
      setPoolConfigs((configs) => {
        if (next.includes(tokenId) && !configs.find((c) => c.tokenId === tokenId)) {
          return [
            ...configs,
            { tokenId, reserveToken: "100000", reserveBase: "10000" },
          ];
        }
        return configs.filter((c) => next.includes(c.tokenId));
      });

      return next;
    });
  }

  function updatePoolConfig(
    tokenId: string,
    field: "reserveToken" | "reserveBase",
    value: string
  ) {
    setPoolConfigs((configs) =>
      configs.map((c) =>
        c.tokenId === tokenId ? { ...c, [field]: value } : c
      )
    );
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    setTokenSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", {
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
      const res = await fetch("/api/arenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: arenaName,
          description: arenaDescription || undefined,
          startingBalance: parseFloat(startingBalance),
          maxAgents: parseInt(maxAgents),
          decayRate: parseFloat(decayRate),
          competitionStart: startDatetime || undefined,
          competitionEnd: endDatetime || undefined,
          tokens: poolConfigs.map((pc) => ({
            tokenId: pc.tokenId,
            reserveToken: parseFloat(pc.reserveToken),
            reserveBase: parseFloat(pc.reserveBase),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create arena");
      }
      setArenaName("");
      setArenaDescription("");
      setStartingBalance("10000");
      setMaxAgents("20");
      setDecayRate("0.001");
      setStartDatetime("");
      setEndDatetime("");
      setSelectedTokens([]);
      setPoolConfigs([]);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create arena");
    } finally {
      setArenaSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 text-center space-y-4">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have admin privileges.
          </p>
          <Link href="/arenas">
            <Button variant="outline">Back to Arenas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
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
              Create Token
            </TabsTrigger>
            <TabsTrigger value="create-arena" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Create Arena
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-1.5">
              <Swords className="w-4 h-4" />
              Manage Arenas ({arenas.length})
            </TabsTrigger>
          </TabsList>

          {/* -- Create Token Tab -- */}
          <TabsContent value="tokens" className="space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <Card className="glass border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Token
                  </CardTitle>
                  <CardDescription>
                    Add a new virtual token for arena trading
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleCreateToken}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-3"
                  >
                    <div className="space-y-1">
                      <Label>Symbol</Label>
                      <Input
                        placeholder="MOONCAT"
                        value={tokenSymbol}
                        onChange={(e) =>
                          setTokenSymbol(e.target.value.toUpperCase())
                        }
                        required
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input
                        placeholder="Moon Cat Token"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Input
                        placeholder="Optional flavor text"
                        value={tokenDescription}
                        onChange={(e) => setTokenDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        disabled={tokenSubmitting}
                        className="w-full"
                      >
                        {tokenSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Create Token"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Existing tokens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tokens.map((token, i) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="glass border-border/30 h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="font-mono text-primary border-primary/30"
                        >
                          {token.symbol}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm mt-2">
                        {token.name}
                      </CardTitle>
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

          {/* -- Create Arena Tab -- */}
          <TabsContent value="create-arena" className="space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <Card className="glass border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Arena
                  </CardTitle>
                  <CardDescription>
                    Set up a new competitive trading arena
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateArena} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Arena Name</Label>
                        <Input
                          placeholder="Daily Sprint #42"
                          value={arenaName}
                          onChange={(e) => setArenaName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Input
                          placeholder="Optional description"
                          value={arenaDescription}
                          onChange={(e) =>
                            setArenaDescription(e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label>Starting Balance (vUSD)</Label>
                        <Input
                          type="number"
                          value={startingBalance}
                          onChange={(e) => setStartingBalance(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Max Agents</Label>
                        <Input
                          type="number"
                          value={maxAgents}
                          onChange={(e) => setMaxAgents(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Decay Rate</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={decayRate}
                          onChange={(e) => setDecayRate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Start Date/Time</Label>
                        <Input
                          type="datetime-local"
                          value={startDatetime}
                          onChange={(e) => setStartDatetime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>End Date/Time</Label>
                        <Input
                          type="datetime-local"
                          value={endDatetime}
                          onChange={(e) => setEndDatetime(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Token selector */}
                    <div className="space-y-2">
                      <Label>Select Tokens</Label>
                      <div className="flex flex-wrap gap-2">
                        {tokens
                          .filter((t) => t.symbol !== "vUSD")
                          .map((token) => (
                            <Button
                              key={token.id}
                              type="button"
                              variant={
                                selectedTokens.includes(token.id)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => toggleToken(token.id)}
                            >
                              {token.symbol}
                            </Button>
                          ))}
                        {tokens.filter((t) => t.symbol !== "vUSD").length ===
                          0 && (
                          <p className="text-xs text-muted-foreground">
                            No tokens available. Create tokens first.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pool configs */}
                    {poolConfigs.length > 0 && (
                      <div className="space-y-3">
                        <Label>Pool Reserves</Label>
                        {poolConfigs.map((config) => {
                          const token = tokens.find(
                            (t) => t.id === config.tokenId
                          );
                          const price =
                            parseFloat(config.reserveBase) /
                            parseFloat(config.reserveToken);
                          return (
                            <div
                              key={config.tokenId}
                              className="glass rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className="font-mono"
                                >
                                  {token?.symbol || "???"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Starting price: $
                                  {isNaN(price) ? "0.00" : price.toFixed(4)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    Token Reserve
                                  </Label>
                                  <Input
                                    type="number"
                                    value={config.reserveToken}
                                    onChange={(e) =>
                                      updatePoolConfig(
                                        config.tokenId,
                                        "reserveToken",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    vUSD Reserve
                                  </Label>
                                  <Input
                                    type="number"
                                    value={config.reserveBase}
                                    onChange={(e) =>
                                      updatePoolConfig(
                                        config.tokenId,
                                        "reserveBase",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={arenaSubmitting || !arenaName}
                      className="w-full"
                    >
                      {arenaSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Plus className="w-4 h-4 mr-1" />
                      )}
                      Create Arena
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* -- Manage Arenas Tab -- */}
          <TabsContent value="manage" className="space-y-6">
            {["active", "upcoming", "completed", "cancelled"].map((status) => {
              const filtered = arenas.filter((a) => a.status === status);
              if (filtered.length === 0) return null;
              return (
                <div key={status}>
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                    <Badge className={statusColors[status] || ""}>
                      {status}
                    </Badge>
                    ({filtered.length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map((arena, i) => (
                      <motion.div
                        key={arena.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className="glass border-border/30 h-full">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-base">
                                {arena.name}
                              </CardTitle>
                              <Badge
                                className={statusColors[arena.status] || ""}
                              >
                                {arena.status}
                              </Badge>
                            </div>
                            {arena.description && (
                              <CardDescription className="line-clamp-1">
                                {arena.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {arena.agentCount || 0}/{arena.max_agents} agents
                              </div>
                              <div className="flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                ${arena.starting_balance.toLocaleString()} start
                              </div>
                              {arena.competition_start && (
                                <div className="flex items-center gap-1 col-span-2">
                                  <Clock className="w-3 h-3" />
                                  {new Date(
                                    arena.competition_start
                                  ).toLocaleDateString()}{" "}
                                  -{" "}
                                  {arena.competition_end
                                    ? new Date(
                                        arena.competition_end
                                      ).toLocaleDateString()
                                    : "TBD"}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
            {arenas.length === 0 && (
              <p className="text-muted-foreground text-center py-12">
                No arenas yet. Create one in the Create Arena tab.
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Admin note */}
        <div className="mt-8 p-4 rounded-lg glass border-border/30 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How admins are designated</p>
          <p>
            Admin privileges are set in the database by setting{" "}
            <code className="text-primary font-mono text-xs">is_admin = true</code>{" "}
            on the user record in the <code className="text-primary font-mono text-xs">users</code> table.
            Only admins can create tokens and arenas.
          </p>
        </div>
      </div>
    </div>
  );
}
