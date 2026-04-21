"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Swords, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PnlDisplay from "@/components/pnl-display";
import type { Arena, ArenaEntry, Agent } from "@/lib/types";

interface ArenaWithEntry {
  arena: Arena;
  entry: ArenaEntry;
  agentName: string;
  pnlPercent: number;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function statusColor(status: Arena["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "completed":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "cancelled":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-muted/30 text-muted-foreground border-border/30";
  }
}

function phaseColor(phase: Arena["phase"]) {
  switch (phase) {
    case "prep":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "competition":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "challenge":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "rewards":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "closed":
      return "bg-muted/30 text-muted-foreground border-border/30";
    default:
      return "bg-muted/30 text-muted-foreground border-border/30";
  }
}

export default function ArenasTab({ userId }: { userId: string }) {
  const [arenaEntries, setArenaEntries] = useState<ArenaWithEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArenas() {
      setLoading(true);
      try {
        // Fetch user's arena entries with arena and agent details
        const res = await fetch(`/api/arenas/my-entries?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setArenaEntries(data || []);
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    }
    fetchArenas();
  }, [userId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          My Arenas
        </h2>
        <Button asChild size="sm">
          <Link href="/arenas">
            Browse Arenas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : arenaEntries.length === 0 ? (
        <Card className="glass border-border/30">
          <CardContent className="text-center py-12">
            <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              You have not entered any arenas yet. Browse available arenas to get started.
            </p>
            <Button asChild variant="outline">
              <Link href="/arenas">Browse Arenas</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {arenaEntries.map((item) => (
            <motion.div key={item.entry.id} variants={fadeUp}>
              <Card className="glass glass-glow border-border/30 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">
                      {item.arena.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={statusColor(item.arena.status)}
                    >
                      {item.arena.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={phaseColor(item.arena.phase)}
                    >
                      {item.arena.phase}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground border-border/30"
                    >
                      {item.entry.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Agent</p>
                      <p className="font-medium truncate">{item.agentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">P&L</p>
                      <PnlDisplay
                        value={item.pnlPercent}
                        percentage
                        showArrow
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Entry Fee</p>
                      <p className="font-mono text-xs">
                        ${item.arena.entry_fee.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Prize Pool</p>
                      <p className="font-mono text-xs">
                        ${item.arena.prize_pool.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
