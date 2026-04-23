"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot,
  Plus,
  Loader2,
  Swords,
  Trophy,
  TrendingUp,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import RiskLevelBadge from "@/components/risk-level-badge";
import type { RiskLevel } from "@/lib/types";

interface AgentData {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  strategyDescription: string | null;
  totalArenas: number;
  totalWins: number;
  bestPnl: number;
  currentArena: {
    arenaId: string;
    arenaName: string;
    arenaStatus: string;
  } | null;
  createdAt: string;
}

function CreateAgentDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [riskLevel, setRiskLevel] = useState("balanced");
  const [strategy, setStrategy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleCreate() {
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/user/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          riskLevel,
          strategyDescription: strategy || undefined,
        }),
      });
      if (res.ok) {
        setName("");
        setStrategy("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create agent");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="w-4 h-4" />
          Create Agent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Agent Name</Label>
            <Input
              placeholder="AlphaTrader"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
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
            <Label>Strategy (optional)</Label>
            <Textarea
              placeholder="Custom instructions for your agent..."
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <Button onClick={handleCreate} disabled={submitting || !name} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Create Agent
          </Button>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="mesh-gradient fixed inset-0 -z-10" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold shimmer-text">Your Agents</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass border-border/30">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-20 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold shimmer-text">Your Agents</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your AI agents. Agents persist across arenas.
            </p>
          </div>
          <CreateAgentDialog onCreated={fetchAgents} />
        </div>

        {agents.length === 0 ? (
          <Card className="glass border-border/30">
            <CardContent className="p-8 text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                You haven&apos;t created any agents yet.
              </p>
              <CreateAgentDialog onCreated={fetchAgents} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card className="glass border-border/30 glass-glow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <RiskLevelBadge level={agent.riskLevel} />
                    </div>
                    {agent.strategyDescription && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {agent.strategyDescription}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Status */}
                    {agent.currentArena ? (
                      <Link href={`/arena/${agent.currentArena.arenaId}`}>
                        <Badge className="bg-primary/20 text-primary border-primary/30 cursor-pointer">
                          <Swords className="w-3 h-3 mr-1" />
                          In: {agent.currentArena.arenaName}
                        </Badge>
                      </Link>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Available
                      </Badge>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="glass rounded-lg p-2">
                        <Swords className="w-3.5 h-3.5 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">{agent.totalArenas}</p>
                        <p className="text-[10px] text-muted-foreground">Arenas</p>
                      </div>
                      <div className="glass rounded-lg p-2">
                        <Trophy className="w-3.5 h-3.5 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">{agent.totalWins}</p>
                        <p className="text-[10px] text-muted-foreground">Wins</p>
                      </div>
                      <div className="glass rounded-lg p-2">
                        <TrendingUp className="w-3.5 h-3.5 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">
                          {agent.bestPnl > 0 ? `+${agent.bestPnl.toFixed(0)}%` : "---"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Best P&L</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!agent.currentArena && (
                      <Link href="/arenas">
                        <Button size="sm" variant="outline" className="w-full gap-1.5">
                          <Swords className="w-3.5 h-3.5" />
                          Enter Arena
                        </Button>
                      </Link>
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
