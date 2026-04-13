"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RiskLevelBadge from "@/components/risk-level-badge";
import PnlDisplay from "@/components/pnl-display";
import TokenIcon from "@/components/token-icon";
import ConfidenceBar from "@/components/confidence-bar";
import type { Agent, Holding, Trade } from "@/lib/types";

interface SharePageClientProps {
  agent: Agent;
  ownerUsername: string;
  holdings: Holding[];
  trades: Trade[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function SharePageClient({
  agent,
  ownerUsername,
  holdings,
  trades,
}: SharePageClientProps) {
  const pnl =
    agent.initial_budget > 0
      ? ((agent.current_balance - agent.initial_budget) / agent.initial_budget) *
        100
      : 0;

  return (
    <div className="min-h-screen mesh-gradient">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <RiskLevelBadge level={agent.risk_level} />
          </div>
          <p className="text-muted-foreground">
            by <span className="text-foreground font-medium">{ownerUsername}</span>
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              icon: DollarSign,
              label: "Current Value",
              value: `$${agent.current_balance.toFixed(2)}`,
            },
            {
              icon: TrendingUp,
              label: "P&L",
              content: <PnlDisplay value={pnl} percentage showArrow />,
            },
            {
              icon: Wallet,
              label: "Initial Budget",
              value: `$${agent.initial_budget.toLocaleString()}`,
            },
            {
              icon: Activity,
              label: "Total Trades",
              value: trades.length.toString(),
            },
          ].map((stat, i) => (
            <Card key={i} className="glass border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
                {stat.content || (
                  <p className="font-bold text-lg">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Holdings */}
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <Card className="glass border-border/30 mb-8">
            <CardHeader>
              <CardTitle className="text-base">Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              {holdings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No holdings
                </p>
              ) : (
                <div className="space-y-3">
                  {holdings.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={h.token} size="md" />
                        <div>
                          <p className="font-medium text-sm">{h.token}</p>
                          <p className="text-xs text-muted-foreground">
                            {h.amount.toFixed(4)} tokens
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-mono">
                        Avg ${h.avg_buy_price < 0.01 ? h.avg_buy_price.toFixed(6) : h.avg_buy_price.toFixed(4)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Trades */}
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <Card className="glass border-border/30 mb-8">
            <CardHeader>
              <CardTitle className="text-base">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No trades yet
                </p>
              ) : (
                <div className="space-y-2">
                  {trades.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 py-2 border-b border-border/10 last:border-0"
                    >
                      <Badge
                        className={`text-[10px] ${
                          t.action === "BUY"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                        variant="outline"
                      >
                        {t.action}
                      </Badge>
                      <span className="font-medium text-sm">{t.token}</span>
                      <span className="text-xs text-muted-foreground">
                        ${t.amount_usd.toFixed(2)}
                      </span>
                      <div className="ml-auto flex items-center gap-3">
                        <div className="w-16">
                          <ConfidenceBar value={t.confidence * 100} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Powered by Silicon Coliseum
          </p>
          <Link href="/login">
            <Button>
              Deploy Your Own Agent
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
