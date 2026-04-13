"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Activity,
  Share2,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RiskLevelBadge from "@/components/risk-level-badge";
import ConfidenceBar from "@/components/confidence-bar";
import TokenIcon from "@/components/token-icon";
import type { Agent, Holding, Trade, Decision } from "@/lib/types";

interface AgentDetailModalProps {
  agent: Agent;
  holdings: Holding[];
  trades: Trade[];
  decisions: Decision[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AgentDetailModal({
  agent,
  holdings,
  trades,
  decisions,
  open,
  onOpenChange,
}: AgentDetailModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);

  async function handleShare() {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agent.id }),
      });
      const data = await res.json();
      if (data.url) {
        setShareUrl(data.url);
        await navigator.clipboard.writeText(window.location.origin + data.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  agent.is_active
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-muted-foreground"
                }`}
              />
              <DialogTitle className="text-xl">{agent.name}</DialogTitle>
              <RiskLevelBadge level={agent.risk_level} />
            </div>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: DollarSign,
              label: "Current Value",
              value: `$${agent.current_balance.toFixed(2)}`,
            },
            {
              icon: TrendingUp,
              label: "P&L",
              value: `${(((agent.current_balance - agent.initial_budget) / agent.initial_budget) * 100).toFixed(1)}%`,
            },
            {
              icon: Wallet,
              label: "Cash",
              value: `$${agent.current_balance.toFixed(2)}`,
            },
            {
              icon: Activity,
              label: "Trades",
              value: trades.length.toString(),
            },
          ].map((stat, i) => (
            <Card key={i} className="bg-muted/30 border-border/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p className="font-bold text-sm">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="holdings" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="holdings" className="flex-1">
              Holdings
            </TabsTrigger>
            <TabsTrigger value="decisions" className="flex-1">
              Decisions
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex-1">
              Trades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="mt-4">
            {holdings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No holdings yet
              </p>
            ) : (
              <div className="space-y-2">
                {holdings.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/20"
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
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        Avg ${h.avg_buy_price < 0.01 ? h.avg_buy_price.toFixed(6) : h.avg_buy_price.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="decisions" className="mt-4">
            {decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No decisions yet
              </p>
            ) : (
              <div className="space-y-3">
                {decisions.slice(0, 10).map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-lg bg-muted/20 border border-border/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={d.should_trade ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {d.should_trade ? "TRADE" : "HOLD"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.created_at).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedDecision(
                            expandedDecision === d.id ? null : d.id
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedDecision === d.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm">{d.reasoning}</p>
                    {expandedDecision === d.id && d.raw_json && (
                      <pre className="mt-2 p-2 rounded bg-background text-xs overflow-auto max-h-40 font-mono">
                        {JSON.stringify(d.raw_json, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trades" className="mt-4">
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No trades yet
              </p>
            ) : (
              <div className="space-y-2">
                {trades.slice(0, 20).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/20"
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{t.token}</span>
                        <span className="text-xs text-muted-foreground">
                          ${t.amount_usd.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.reasoning}
                      </p>
                    </div>
                    <div className="shrink-0 w-16">
                      <ConfidenceBar value={t.confidence * 100} />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
