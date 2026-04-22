"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Trophy,
  Swords,
  TrendingUp,
  Coins,
  BarChart3,
  Users,
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
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/theme-toggle";
import PnlDisplay from "@/components/pnl-display";

interface UserProfile {
  username: string;
  cpBalance: number;
  totalArenas: number;
  wins: number;
  top3Finishes: number;
  bestPnl: number;
  totalTrades: number;
}

interface ActiveArenaAgent {
  arenaId: string;
  arenaName: string;
  agentName: string;
  currentRank: number;
  pnlPercent: number;
  status: string;
}

interface ArenaHistoryEntry {
  arenaId: string;
  arenaName: string;
  agentName: string;
  rank: number;
  pnlPercent: number;
  cpEarned: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeAgents, setActiveAgents] = useState<ActiveArenaAgent[]>([]);
  const [history, setHistory] = useState<ArenaHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profileRes = await fetch("/api/user/profile");
      if (profileRes.status === 401) {
        router.push("/login");
        return;
      }
      if (!profileRes.ok) throw new Error("Failed to load profile");

      const profileData = await profileRes.json();
      const p = profileData.profile || profileData;
      setProfile({
        username: p.username || "User",
        cpBalance: p.cpBalance ?? p.cp_balance ?? 100,
        totalArenas: p.totalArenas ?? p.total_arenas ?? 0,
        wins: p.wins ?? 0,
        top3Finishes: p.top3Finishes ?? p.top3_finishes ?? 0,
        bestPnl: p.bestPnl ?? p.best_pnl ?? 0,
        totalTrades: p.totalTrades ?? p.total_trades ?? 0,
      });

      // Fetch active agents
      try {
        const activeRes = await fetch("/api/user/profile?include=active_arenas");
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          setActiveAgents(activeData.activeArenas || []);
        }
      } catch {
        /* optional */
      }

      // Fetch history
      try {
        const historyRes = await fetch("/api/user/profile?include=history");
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData.history || []);
        }
      } catch {
        /* optional */
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
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
            <h1 className="text-lg font-bold gradient-text">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/arenas">
              <Button size="sm">Browse Arenas</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Profile Stats */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass border-border/30 glass-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {profile.username}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Your arena performance overview
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <Coins className="w-5 h-5" />
                    <span className="text-2xl font-bold">
                      {profile.cpBalance} CP
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="glass rounded-lg p-4 text-center">
                    <Swords className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">
                      {profile.totalArenas}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Arenas Competed
                    </p>
                  </div>
                  <div className="glass rounded-lg p-4 text-center">
                    <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{profile.wins}</p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </div>
                  <div className="glass rounded-lg p-4 text-center">
                    <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">
                      {profile.top3Finishes}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Top 3 Finishes
                    </p>
                  </div>
                  <div className="glass rounded-lg p-4 text-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold">
                      <PnlDisplay
                        value={profile.bestPnl}
                        percentage
                        showArrow={false}
                        size="lg"
                      />
                    </p>
                    <p className="text-xs text-muted-foreground">Best P&L</p>
                  </div>
                  <div className="glass rounded-lg p-4 text-center">
                    <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">
                      {profile.totalTrades}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Trades
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active Arenas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            Active Arenas
          </h3>
          {activeAgents.length === 0 ? (
            <Card className="glass border-border/30">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any agents in active arenas.
                </p>
                <Link href="/arenas">
                  <Button className="gap-1.5">
                    Browse Arenas
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAgents.map((agent, i) => (
                <Link key={i} href={`/arena/${agent.arenaId}`}>
                  <Card className="glass border-border/30 glass-glow h-full group cursor-pointer hover:border-primary/30 transition-all">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {agent.arenaName}
                      </CardTitle>
                      <CardDescription>{agent.agentName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Rank: <span className="text-foreground font-bold">#{agent.currentRank}</span>
                        </div>
                        <PnlDisplay
                          value={agent.pnlPercent}
                          percentage
                          size="sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        <Separator className="bg-border/30" />

        {/* Arena History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Arena History
          </h3>
          {history.length === 0 ? (
            <Card className="glass border-border/30">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  No completed arenas yet. Enter your first arena to get
                  started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((entry, i) => (
                <Link key={i} href={`/arena/${entry.arenaId}/results`}>
                  <Card className="glass border-border/30 hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg w-12 text-center">
                          #{entry.rank}
                        </span>
                        <div>
                          <p className="font-medium">{entry.arenaName}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.agentName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <PnlDisplay
                          value={entry.pnlPercent}
                          percentage
                          size="sm"
                        />
                        {entry.cpEarned > 0 && (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            +{entry.cpEarned} CP
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
