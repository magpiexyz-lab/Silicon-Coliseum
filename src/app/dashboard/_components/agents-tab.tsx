"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pause, Play, Trash2, Eye, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RiskLevelBadge from "@/components/risk-level-badge";
import TokenIcon from "@/components/token-icon";
import CreateAgentForm from "./create-agent-form";
import AgentDetailModal from "./agent-detail-modal";
import type { Agent, Holding, Trade, Decision } from "@/lib/types";

interface AgentsTabProps {
  agents: Agent[];
  holdings: Holding[];
  trades: Trade[];
  decisions: Decision[];
  userId: string;
  walletAddress: string;
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

export default function AgentsTab({
  agents,
  holdings,
  trades,
  decisions,
  userId,
  walletAddress,
  onRefresh,
}: AgentsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleAgent(agent: Agent) {
    setTogglingId(agent.id);
    try {
      await fetch(`/api/agents/${agent.id}/toggle`, { method: "PATCH" });
      onRefresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteAgent() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/agents/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      onRefresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {agents.map((agent) => {
          const agentHoldings = holdings.filter(
            (h) => h.agent_id === agent.id
          );
          const agentTrades = trades.filter((t) => t.agent_id === agent.id);

          return (
            <motion.div key={agent.id} variants={fadeUp}>
              <Card className="glass glass-glow border-border/30 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          agent.is_active
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-muted-foreground"
                        }`}
                      />
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                    </div>
                    <RiskLevelBadge level={agent.risk_level} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="font-mono font-medium">
                        ${agent.current_balance.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trades</p>
                      <p className="font-medium">{agentTrades.length}</p>
                    </div>
                  </div>

                  {/* Token icons */}
                  <div className="flex flex-wrap gap-1">
                    {(agent.tokens as string[]).slice(0, 6).map((t) => (
                      <TokenIcon key={t} symbol={t} size="sm" />
                    ))}
                    {(agent.tokens as string[]).length > 6 && (
                      <span className="text-xs text-muted-foreground self-center ml-1">
                        +{(agent.tokens as string[]).length - 6}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAgent(agent)}
                      disabled={togglingId === agent.id}
                    >
                      {agent.is_active ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(agent)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Create Agent Card */}
        <motion.div variants={fadeUp}>
          <Card
            className="glass border-dashed border-border/50 h-full cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center min-h-[200px]"
            onClick={() => setShowCreate(true)}
          >
            <CardContent className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-sm">Create New Agent</p>
              <p className="text-xs text-muted-foreground mt-1">
                Deploy an AI trading agent
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Create Agent Dialog */}
      <CreateAgentForm
        open={showCreate}
        onOpenChange={setShowCreate}
        walletAddress={walletAddress}
        onCreated={() => {
          setShowCreate(false);
          onRefresh();
        }}
      />

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          holdings={holdings.filter((h) => h.agent_id === selectedAgent.id)}
          trades={trades.filter((t) => t.agent_id === selectedAgent.id)}
          decisions={decisions.filter(
            (d) => d.agent_id === selectedAgent.id
          )}
          open={!!selectedAgent}
          onOpenChange={(open) => !open && setSelectedAgent(null)}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Agent
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This will permanently
              remove all holdings, trades, and decisions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAgent}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
