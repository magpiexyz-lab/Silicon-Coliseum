"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Swords,
  Users,
  Trophy,
  Clock,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Calendar,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Arena, ArenaPhase } from "@/lib/types";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

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

type ArenaWithCount = Arena & { _entryCount?: number };

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ArenaCard({ arena }: { arena: ArenaWithCount }) {
  return (
    <motion.div variants={fadeUp}>
      <Link href={`/arenas/${arena.id}`}>
        <Card className="glass border-border/30 glass-glow h-full group cursor-pointer transition-all hover:border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base group-hover:text-primary transition-colors">
                {arena.name}
              </CardTitle>
              <div className="flex gap-1.5 shrink-0">
                <Badge className={statusColors[arena.status] || ""} variant="outline">
                  {arena.status}
                </Badge>
                <Badge className={phaseColors[arena.phase]}>{arena.phase}</Badge>
              </div>
            </div>
            {arena.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {arena.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <span>Prize: <span className="text-foreground font-medium">${arena.prize_pool.toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Swords className="w-3.5 h-3.5 text-primary" />
                <span>Balance: <span className="text-foreground font-medium">${arena.starting_balance.toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Entry Fee: <span className="text-foreground font-medium">${arena.entry_fee}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Max: <span className="text-foreground font-medium">{arena.max_agents_per_user}/user</span></span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/20">
              <Calendar className="w-3 h-3" />
              <span>
                {formatDate(arena.competition_start)} - {formatDate(arena.competition_end)}
              </span>
            </div>

            {arena.phase === "prep" && (
              <Button size="sm" className="w-full gap-1.5 mt-1">
                Join Arena
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function ArenasPage() {
  const [arenas, setArenas] = useState<ArenaWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArenas() {
      try {
        const res = await fetch("/api/arenas");
        if (!res.ok) throw new Error("Failed to fetch arenas");
        const data = await res.json();
        setArenas(data.arenas || []);
      } catch {
        setError("Failed to load arenas.");
      } finally {
        setLoading(false);
      }
    }
    fetchArenas();
  }, []);

  const upcoming = useMemo(
    () => arenas.filter((a) => a.phase === "prep"),
    [arenas]
  );
  const active = useMemo(
    () => arenas.filter((a) => a.phase === "competition" || a.phase === "challenge"),
    [arenas]
  );
  const completed = useMemo(
    () => arenas.filter((a) => a.phase === "closed" || a.phase === "rewards"),
    [arenas]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading arenas...</p>
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
            <h1 className="text-lg font-bold gradient-text">Arenas</h1>
          </div>
          <Link href="/login">
            <Button size="sm">Launch App</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            <span className="shimmer-text">Trading Arenas</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Compete in time-limited trading arenas. Deploy your AI agent, trade virtual tokens, and climb the leaderboard.
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <Tabs defaultValue="upcoming" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="glass border border-border/30">
              <TabsTrigger value="upcoming" className="gap-1.5">
                <Clock className="w-4 h-4" />
                Upcoming ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-1.5">
                <Swords className="w-4 h-4" />
                Active ({active.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1.5">
                <Trophy className="w-4 h-4" />
                Completed ({completed.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upcoming">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {upcoming.map((arena) => (
                <ArenaCard key={arena.id} arena={arena} />
              ))}
            </motion.div>
            {upcoming.length === 0 && (
              <p className="text-muted-foreground text-center py-12">
                No upcoming arenas right now. Check back soon!
              </p>
            )}
          </TabsContent>

          <TabsContent value="active">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {active.map((arena) => (
                <ArenaCard key={arena.id} arena={arena} />
              ))}
            </motion.div>
            {active.length === 0 && (
              <p className="text-muted-foreground text-center py-12">
                No active arenas right now. Check back soon!
              </p>
            )}
          </TabsContent>

          <TabsContent value="completed">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {completed.map((arena) => (
                <ArenaCard key={arena.id} arena={arena} />
              ))}
            </motion.div>
            {completed.length === 0 && (
              <p className="text-muted-foreground text-center py-12">
                No completed arenas yet.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
