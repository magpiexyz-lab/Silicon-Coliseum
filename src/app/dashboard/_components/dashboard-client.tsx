"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Copy, ExternalLink, LogOut, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/theme-toggle";
import SCTBalanceBadge from "./sct-balance-badge";
import MarketTicker from "./market-ticker";
import OverviewTab from "./overview-tab";
import AgentsTab from "./agents-tab";
import LeaderboardTab from "./leaderboard-tab";
import type { User, Agent, Holding, Trade, Decision } from "@/lib/types";

interface DashboardClientProps {
  user: User;
  agents: Agent[];
  holdings: Holding[];
  trades: Trade[];
  decisions: Decision[];
  walletAddress: string;
}

export default function DashboardClient({
  user,
  agents: initialAgents,
  holdings: initialHoldings,
  trades: initialTrades,
  decisions: initialDecisions,
  walletAddress,
}: DashboardClientProps) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [holdings] = useState(initialHoldings);
  const [trades] = useState(initialTrades);
  const [decisions] = useState(initialDecisions);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const truncatedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  const copyAddress = useCallback(async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const handleDisconnect = useCallback(() => {
    document.cookie = "session=; path=/; max-age=0";
    router.push("/login");
  }, [router]);

  const refreshAgents = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents?user_id=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setAgents(data);
    } catch {}
  }, [user.id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Brand + Tabs (desktop) */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold gradient-text hidden sm:block">
              Silicon Coliseum
            </Link>
            <Link href="/" className="text-lg font-bold gradient-text sm:hidden">
              SC
            </Link>
          </div>

          {/* Center: Tab navigation (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {["overview", "agents", "leaderboard"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <SCTBalanceBadge walletAddress={walletAddress} />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 font-mono text-xs">
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{truncatedAddress}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={copyAddress}>
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy Address"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={`https://arbiscan.io/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Arbiscan
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile tab navigation */}
        <div className="md:hidden border-t border-border/20 overflow-x-auto">
          <div className="flex px-4 gap-1 py-1">
            {["overview", "agents", "leaderboard"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Market Ticker */}
      <MarketTicker />

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <OverviewTab
                agents={agents}
                holdings={holdings}
                trades={trades}
                userId={user.id}
                onRefresh={refreshAgents}
              />
            )}
            {activeTab === "agents" && (
              <AgentsTab
                agents={agents}
                holdings={holdings}
                trades={trades}
                decisions={decisions}
                userId={user.id}
                walletAddress={walletAddress}
                onRefresh={refreshAgents}
              />
            )}
            {activeTab === "leaderboard" && (
              <LeaderboardTab userId={user.id} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
