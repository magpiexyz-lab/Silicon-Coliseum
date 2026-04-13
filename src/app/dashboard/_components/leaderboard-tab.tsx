"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RiskLevelBadge from "@/components/risk-level-badge";
import PnlDisplay from "@/components/pnl-display";
import type { LeaderboardEntry } from "@/lib/types";

const medals = ["text-yellow-400", "text-gray-300", "text-amber-600"];

export default function LeaderboardTab({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="glass border-border/30">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Global Leaderboard
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardHeader>
        <CardContent>
          {entries.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No agents on the leaderboard yet. Deploy yours to be first!
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
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Budget
                    </TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">P&L %</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      Trades
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.agentId}>
                      <TableCell>
                        <span
                          className={`font-bold ${medals[entry.rank - 1] || "text-muted-foreground"}`}
                        >
                          {entry.rank <= 3
                            ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                            : `#${entry.rank}`}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.agentName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {entry.ownerUsername}
                      </TableCell>
                      <TableCell>
                        <RiskLevelBadge level={entry.riskLevel} />
                      </TableCell>
                      <TableCell className="text-right font-mono hidden md:table-cell">
                        ${entry.initialBudget.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${entry.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <PnlDisplay
                          value={entry.pnlPercent}
                          percentage
                          showArrow
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
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
  );
}
