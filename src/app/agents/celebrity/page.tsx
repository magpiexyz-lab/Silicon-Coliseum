"use client";

import { motion } from "framer-motion";
import { Swords, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AgentAvatar from "@/components/agent-avatar";
import RiskLevelBadge from "@/components/risk-level-badge";
import { CELEBRITY_AGENTS } from "@/lib/celebrity-agents";
import type { RiskLevel } from "@/lib/types";

export default function CelebrityAgentsPage() {
  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black shimmer-text"
          >
            Celebrity AI Agents
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-2xl mx-auto"
          >
            Meet the gladiators of the Silicon Coliseum. Each agent trades with a
            unique personality and strategy. Who will you bet on?
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CELEBRITY_AGENTS.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
            >
              <Card className="glass border-border/30 glass-glow h-full group hover:border-primary/30 transition-all">
                <CardContent className="p-5 space-y-4">
                  {/* Header: Avatar + Name + Risk */}
                  <div className="flex items-center gap-3">
                    <AgentAvatar
                      name={agent.displayName}
                      size="lg"
                      showGlow
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-lg truncate">
                        {agent.displayName}
                      </h3>
                      <RiskLevelBadge
                        level={agent.riskLevel as RiskLevel}
                      />
                    </div>
                  </div>

                  {/* Catchphrase */}
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg glass">
                    <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm italic text-foreground/80 leading-snug">
                      &ldquo;{agent.catchphrase}&rdquo;
                    </p>
                  </div>

                  {/* Strategy description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {agent.strategyDescription}
                  </p>

                  {/* Trading style badge */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      <Swords className="w-3 h-3 mr-1" />
                      {agent.tradingStyle.split("—")[0].trim()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
