"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Bot,
  Activity,
  Plus,
  Coins,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AnimatedCounter from "@/components/animated-counter";
import PnlDisplay from "@/components/pnl-display";
import RiskLevelBadge from "@/components/risk-level-badge";
import type { Agent, Holding, Trade } from "@/lib/types";

interface OverviewTabProps {
  agents: Agent[];
  holdings: Holding[];
  trades: Trade[];
  userId: string;
  onRefresh: () => void;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function OverviewTab({
  agents,
  holdings,
  trades,
  userId,
  onRefresh,
}: OverviewTabProps) {
  const stats = useMemo(() => {
    const totalBudget = agents.reduce((s, a) => s + a.initial_budget, 0);
    const totalBalance = agents.reduce((s, a) => s + a.current_balance, 0);
    // Note: holdings value requires live prices which we don't have here
    // Approximate with balance only for now
    const totalValue = totalBalance;
    const pnl = totalBudget > 0 ? ((totalValue - totalBudget) / totalBudget) * 100 : 0;
    const activeAgents = agents.filter((a) => a.is_active).length;
    const totalTrades = trades.length;

    return { totalValue, totalBudget, pnl, activeAgents, totalTrades };
  }, [agents, trades]);

  const recentTrades = trades.slice(0, 10);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: DollarSign,
            label: "Portfolio Value",
            value: stats.totalValue,
            format: "currency" as const,
          },
          {
            icon: TrendingUp,
            label: "Total P&L",
            value: stats.pnl,
            format: "percent" as const,
            isPnl: true,
          },
          {
            icon: Bot,
            label: "Active Agents",
            value: stats.activeAgents,
            format: "number" as const,
          },
          {
            icon: Activity,
            label: "Total Trades",
            value: stats.totalTrades,
            format: "number" as const,
          },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Card className="glass border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {stat.isPnl ? (
                    <PnlDisplay value={stat.value} percentage showArrow />
                  ) : (
                    <AnimatedCounter
                      value={stat.value}
                      format={stat.format}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions + Active Agents + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Agents */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="glass border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Agents</CardTitle>
            </CardHeader>
            <CardContent>
              {agents.filter((a) => a.is_active).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active agents. Deploy your first AI agent to get started.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agents
                    .filter((a) => a.is_active)
                    .slice(0, 4)
                    .map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/20"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-medium text-sm">
                              {agent.name}
                            </span>
                          </div>
                          <RiskLevelBadge
                            level={agent.risk_level}
                            className="mt-1"
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono">
                            ${agent.current_balance.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions + Recent Trades */}
        <motion.div variants={fadeUp} className="space-y-4">
          <Card className="glass border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Plus className="w-4 h-4" />
                Create Agent
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Coins className="w-4 h-4" />
                Buy SCT
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={async () => {
                  await fetch("/api/evaluate", { method: "POST" });
                  onRefresh();
                }}
              >
                <Zap className="w-4 h-4" />
                Evaluate Now
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No trades yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTrades.slice(0, 5).map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.action === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.action}
                        </span>
                        <span className="font-medium">{trade.token}</span>
                      </div>
                      <span className="text-muted-foreground font-mono">
                        ${trade.amount_usd.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
