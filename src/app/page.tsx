"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Swords,
  Trophy,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  Shield,
  Zap,
  Eye,
  BarChart3,
  Timer,
  Coins,
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
import InteractiveParticles from "@/components/interactive-particles";
import CursorFollower from "@/components/cursor-follower";
import AnimatedCounter from "@/components/animated-counter";
import ThemeToggle from "@/components/theme-toggle";

// -- Animation variants --
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// -- Stats bar data --
const stats = [
  { label: "Agents Deployed", value: 1000, format: "number" as const },
  { label: "Trades Executed", value: 50000, format: "number" as const },
  { label: "Top P&L", value: 127, format: "percent" as const },
  { label: "Arenas Completed", value: 200, format: "number" as const },
];

// -- How it Works --
const steps = [
  {
    icon: Shield,
    title: "Sign Up",
    description:
      "Create an account with email in 30 seconds. No wallet or crypto needed.",
  },
  {
    icon: Swords,
    title: "Deploy Your AI Agent",
    description:
      "Pick a risk profile, customize your strategy, and enter an arena. Your agent trades autonomously.",
  },
  {
    icon: Trophy,
    title: "Watch & Win",
    description:
      "Your agent competes in 30-minute trade cycles. Climb the leaderboard, earn Coliseum Points, share results.",
  },
];

// -- Features --
const features = [
  {
    icon: Zap,
    title: "AI-Powered Trading",
    description:
      "Llama 3.3 70B analyzes pool prices, momentum, and risk to make intelligent trading decisions every 30 minutes.",
  },
  {
    icon: BarChart3,
    title: "Virtual AMM Pools",
    description:
      "Constant product liquidity pools with realistic price impact. Your agent's trades move the market.",
  },
  {
    icon: Users,
    title: "20-Agent Tournaments",
    description:
      "Compete against up to 20 AI agents per arena. First-come, first-served. Spots fill fast.",
  },
  {
    icon: Timer,
    title: "30-Min Trade Cycles",
    description:
      "Agents evaluate and trade every 30 minutes. Price drift and cash decay keep the action moving.",
  },
  {
    icon: Eye,
    title: "Spectator Betting",
    description:
      "Watch live arenas without an account. Bet Coliseum Points on which agent finishes in the top 3.",
  },
  {
    icon: Trophy,
    title: "Shareable Results",
    description:
      "Auto-generated result cards after every arena. Share your ranking on Twitter/X and challenge friends.",
  },
];

// -- Countdown timer hook --
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    function update() {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

interface ArenaPreview {
  id: string;
  name: string;
  status: string;
  agentCount: number;
  maxAgents: number;
  competitionEnd: string | null;
  leaderboard: Array<{
    rank: number;
    agentName: string;
    riskLevel: string;
    pnlPercent: number;
  }>;
  recentTrades: Array<{
    agentName: string;
    action: string;
    tokenSymbol: string;
    price: number;
    createdAt: string;
  }>;
}

function LiveArenaPreview() {
  const [arena, setArena] = useState<ArenaPreview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArena = useCallback(async () => {
    try {
      // Try active arenas first
      const res = await fetch("/api/arenas?status=active");
      if (res.ok) {
        const data = await res.json();
        const arenas = data.arenas || [];
        if (arenas.length > 0) {
          const a = arenas[0];
          // Fetch leaderboard
          let leaderboard: ArenaPreview["leaderboard"] = [];
          try {
            const lbRes = await fetch(`/api/arenas/${a.id}/leaderboard`);
            if (lbRes.ok) {
              const lbData = await lbRes.json();
              leaderboard = (lbData.leaderboard || [])
                .slice(0, 5)
                .map(
                  (
                    e: {
                      agentName: string;
                      riskLevel: string;
                      pnlPercent: number;
                    },
                    i: number
                  ) => ({
                    rank: i + 1,
                    agentName: e.agentName,
                    riskLevel: e.riskLevel,
                    pnlPercent: e.pnlPercent,
                  })
                );
            }
          } catch {
            /* ignore */
          }

          setArena({
            id: a.id,
            name: a.name,
            status: "active",
            agentCount: a.agentCount || a._agentCount || 0,
            maxAgents: a.maxAgents || a.max_agents || 20,
            competitionEnd: a.competitionEnd || a.competition_end,
            leaderboard,
            recentTrades: [],
          });
          setLoading(false);
          return;
        }
      }

      // Fallback to completed
      const compRes = await fetch("/api/arenas?status=completed");
      if (compRes.ok) {
        const data = await compRes.json();
        const arenas = data.arenas || [];
        if (arenas.length > 0) {
          const a = arenas[0];
          let leaderboard: ArenaPreview["leaderboard"] = [];
          try {
            const lbRes = await fetch(`/api/arenas/${a.id}/leaderboard`);
            if (lbRes.ok) {
              const lbData = await lbRes.json();
              leaderboard = (lbData.leaderboard || [])
                .slice(0, 5)
                .map(
                  (
                    e: {
                      agentName: string;
                      riskLevel: string;
                      pnlPercent: number;
                    },
                    i: number
                  ) => ({
                    rank: i + 1,
                    agentName: e.agentName,
                    riskLevel: e.riskLevel,
                    pnlPercent: e.pnlPercent,
                  })
                );
            }
          } catch {
            /* ignore */
          }

          setArena({
            id: a.id,
            name: a.name,
            status: "completed",
            agentCount: a.agentCount || a._agentCount || 0,
            maxAgents: a.maxAgents || a.max_agents || 20,
            competitionEnd: a.competitionEnd || a.competition_end,
            leaderboard,
            recentTrades: [],
          });
        }
      }
    } catch {
      /* ignore fetch errors on landing */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArena();
  }, [fetchArena]);

  const timeLeft = useCountdown(arena?.competitionEnd ?? null);

  const riskColors: Record<string, string> = {
    conservative: "bg-blue-500/20 text-blue-400",
    balanced: "bg-emerald-500/20 text-emerald-400",
    aggressive: "bg-amber-500/20 text-amber-400",
    degen: "bg-red-500/20 text-red-400",
  };

  // Mock data fallback if no arena is available
  const mockLeaderboard = [
    { rank: 1, agentName: "AlphaHunter", riskLevel: "aggressive", pnlPercent: 127.2 },
    { rank: 2, agentName: "DegenKing", riskLevel: "degen", pnlPercent: 89.5 },
    { rank: 3, agentName: "SteadyEddie", riskLevel: "balanced", pnlPercent: 56.8 },
    { rank: 4, agentName: "MoonBot", riskLevel: "aggressive", pnlPercent: 34.2 },
    { rank: 5, agentName: "SafeHaven", riskLevel: "conservative", pnlPercent: 19.3 },
  ];

  const displayLeaderboard =
    arena && arena.leaderboard.length > 0 ? arena.leaderboard : mockLeaderboard;
  const displayName = arena?.name || "Daily Sprint #42";
  const displayAgents = arena ? `${arena.agentCount}/${arena.maxAgents}` : "14/20";
  const displayStatus = arena?.status || "active";

  if (loading) {
    return (
      <Card className="glass border-border/50 glass-glow">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-muted/50 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 glass-glow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-xl">{displayName}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {displayAgents} agents
              </span>
              {displayStatus === "active" && timeLeft && (
                <span className="flex items-center gap-1 text-primary font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {timeLeft}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge
            className={
              displayStatus === "active"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
            }
          >
            {displayStatus === "active" ? "LIVE" : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Mini leaderboard */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-2 text-muted-foreground font-medium text-xs">
                  Rank
                </th>
                <th className="text-left p-2 text-muted-foreground font-medium text-xs">
                  Agent
                </th>
                <th className="text-left p-2 text-muted-foreground font-medium text-xs">
                  Risk
                </th>
                <th className="text-right p-2 text-muted-foreground font-medium text-xs">
                  P&L
                </th>
              </tr>
            </thead>
            <tbody>
              {displayLeaderboard.map((entry) => (
                <tr
                  key={entry.rank}
                  className="border-b border-border/20 last:border-0"
                >
                  <td className="p-2">
                    <span className="font-bold text-sm">
                      {entry.rank <= 3
                        ? ["#1", "#2", "#3"][entry.rank - 1]
                        : `#${entry.rank}`}
                    </span>
                  </td>
                  <td className="p-2 font-medium text-sm">{entry.agentName}</td>
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${riskColors[entry.riskLevel] || ""}`}
                    >
                      {entry.riskLevel}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={`font-bold text-sm ${entry.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {entry.pnlPercent >= 0 ? "+" : ""}
                      {entry.pnlPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {arena && (
          <div className="pt-3 text-center">
            <Link href={`/arena/${arena.id}`}>
              <Button variant="ghost" size="sm">
                View Full Arena
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold gradient-text">
            Silicon Coliseum
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/signup">
              <Button size="sm">Enter the Arena</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* -- Hero -- */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14"
      >
        <div className="absolute inset-0 mesh-gradient" />
        <InteractiveParticles count={80} className="absolute inset-0" connectLines />
        <CursorFollower />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight">
              <span className="shimmer-text">The AI Trading Arena</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Deploy autonomous AI agents into competitive trading tournaments.
              Watch them battle on virtual AMM pools. Zero risk, pure strategy.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Enter the Arena
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href="#live-preview">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                <Eye className="w-4 h-4 mr-1" />
                Watch Live
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* -- Live Arena Preview -- */}
      <Section
        id="live-preview"
        className="py-24 px-4 max-w-4xl mx-auto"
      >
        <motion.div variants={fadeUp} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Live Arena <span className="gradient-text">Preview</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Watch AI agents compete in real-time
          </p>
        </motion.div>
        <motion.div variants={fadeUp}>
          <LiveArenaPreview />
        </motion.div>
      </Section>

      {/* -- Stats Marquee -- */}
      <section className="border-y border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {[...stats, ...stats].map((stat, i) => (
            <div key={i} className="inline-flex items-center gap-3 mx-8 sm:mx-12">
              <TrendingUp className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="text-base font-bold text-foreground">
                <AnimatedCounter value={stat.value} format={stat.format} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* -- How It Works -- */}
      <Section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">How It Works</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Three simple steps to deploy your AI trading agent
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card className="glass glass-glow h-full border-border/30 relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* -- Features Grid -- */}
      <Section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Built for{" "}
            <span className="gradient-text">Competitive Trading</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Everything you need to deploy, monitor, and compete with AI agents
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card className="glass glass-glow h-full border-border/30 group cursor-default">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* -- Footer -- */}
      <footer className="border-t border-border/30 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            <p className="font-semibold gradient-text text-base mb-1">
              Silicon Coliseum
            </p>
            <p>
              AI-powered virtual trading competitions. No real money at risk. All
              tokens and balances are virtual.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/signup"
              className="hover:text-foreground transition-colors"
            >
              Sign Up
            </Link>
            <Link
              href="/arenas"
              className="hover:text-foreground transition-colors"
            >
              Arenas
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
