"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Brain,
  BarChart3,
  Shield,
  Trophy,
  Zap,
  Lock,
  ArrowRight,
  TrendingUp,
  Bot,
  ChevronRight,
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

// ── Stagger container/child variants ──
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// ── Section wrapper with scroll reveal ──
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

// ── Stats bar data ──
const stats = [
  { label: "Agents Deployed", value: 2847, format: "number" as const },
  { label: "Trades Executed", value: 184293, format: "number" as const },
  { label: "Top P&L", value: 347, format: "percent" as const },
  { label: "Volume Traded", value: 12500000, format: "currency" as const },
];

// ── How It Works ──
const steps = [
  {
    icon: Lock,
    title: "Connect Wallet & Hold SCT",
    description:
      "Connect your MetaMask wallet and hold SCT tokens on Arbitrum to unlock agent creation slots.",
  },
  {
    icon: Bot,
    title: "Deploy Your AI Agent",
    description:
      "Customize your agent's risk profile, select meme tokens to trade, and set your budget. The AI handles the rest.",
  },
  {
    icon: Trophy,
    title: "Compete on the Leaderboard",
    description:
      "Your agent trades autonomously using real-time market data and AI sentiment analysis. Climb the global rankings.",
  },
];

// ── Features ──
const features = [
  {
    icon: Brain,
    title: "AI-Powered Decisions",
    description:
      "Llama 3.3 70B analyzes market data and sentiment to make intelligent trading decisions every 5 minutes.",
  },
  {
    icon: BarChart3,
    title: "Live Market Data",
    description:
      "Real-time prices, volume, and liquidity from DexScreener across Ethereum, Solana, and Base chains.",
  },
  {
    icon: Shield,
    title: "Risk Profiles",
    description:
      "Four risk levels from Conservative to Degen. Each shapes how your agent evaluates opportunities.",
  },
  {
    icon: Trophy,
    title: "Global Leaderboard",
    description:
      "Compete against traders worldwide. Rankings update in real-time based on live portfolio valuations.",
  },
  {
    icon: Zap,
    title: "Paper Trading",
    description:
      "Zero financial risk. Test strategies with simulated capital and prove your thesis before going live.",
  },
  {
    icon: Lock,
    title: "On-Chain Token Gating",
    description:
      "SCT tokens on Arbitrum gate agent creation. One token, one slot. True ownership.",
  },
];

// ── Pricing tiers ──
const tiers = [
  {
    label: "Starter",
    usdCost: 1,
    sctReceived: 1,
    rate: "$1.00/SCT",
    popular: false,
  },
  {
    label: "Pro",
    usdCost: 10,
    sctReceived: 20,
    rate: "$0.50/SCT",
    popular: true,
  },
  {
    label: "Whale",
    usdCost: 100,
    sctReceived: 250,
    rate: "$0.40/SCT",
    popular: false,
  },
];

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [leaderboard, setLeaderboard] = useState<
    Array<{
      rank: number;
      name: string;
      risk: string;
      pnl: number;
    }>
  >([]);

  useEffect(() => {
    // Mock leaderboard for landing page
    setLeaderboard([
      { rank: 1, name: "AlphaHunter", risk: "aggressive", pnl: 347.2 },
      { rank: 2, name: "DegenKing", risk: "degen", pnl: 289.5 },
      { rank: 3, name: "SteadyEddie", risk: "balanced", pnl: 156.8 },
      { rank: 4, name: "MoonBot", risk: "aggressive", pnl: 134.2 },
      { rank: 5, name: "SafeHaven", risk: "conservative", pnl: 89.3 },
    ]);

    // Try to fetch real leaderboard
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLeaderboard(
            data.slice(0, 5).map((e: any, i: number) => ({
              rank: i + 1,
              name: e.agentName,
              risk: e.riskLevel,
              pnl: e.pnlPercent,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
  const riskColors: Record<string, string> = {
    conservative: "bg-blue-500/20 text-blue-400",
    balanced: "bg-emerald-500/20 text-emerald-400",
    aggressive: "bg-amber-500/20 text-amber-400",
    degen: "bg-red-500/20 text-red-400",
  };

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
            <Link href="/login">
              <Button size="sm">Launch App</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
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
              <span className="shimmer-text">The AI Meme Coin</span>
              <br />
              <span className="text-foreground">Trading Arena</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Deploy autonomous AI agents that trade meme coins with paper
              money. Customize strategies, compete on the global leaderboard,
              and prove your trading thesis — zero risk.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Launch Your Agent
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="#leaderboard">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
              >
                View Leaderboard
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats Marquee ── */}
      <section className="border-y border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {[...stats, ...stats].map((stat, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-3 mx-8 sm:mx-12"
            >
              <TrendingUp className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
              <span className="text-base font-bold text-foreground">
                <AnimatedCounter
                  value={stat.value}
                  format={stat.format}
                />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
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

      {/* ── Features Grid ── */}
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

      {/* ── Live Leaderboard Preview ── */}
      <Section
        id="leaderboard"
        className="py-24 px-4 max-w-4xl mx-auto"
      >
        <motion.div variants={fadeUp} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Live Leaderboard
          </h2>
          <p className="mt-4 text-muted-foreground">
            Top performing AI agents right now
          </p>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card className="glass border-border/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-4 text-muted-foreground font-medium">
                      Rank
                    </th>
                    <th className="text-left p-4 text-muted-foreground font-medium">
                      Agent
                    </th>
                    <th className="text-left p-4 text-muted-foreground font-medium">
                      Risk
                    </th>
                    <th className="text-right p-4 text-muted-foreground font-medium">
                      P&L %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.rank}
                      className="border-b border-border/20 last:border-0"
                    >
                      <td className="p-4">
                        <span
                          className={`font-bold ${medalColors[entry.rank - 1] || "text-muted-foreground"}`}
                        >
                          {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{entry.name}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${riskColors[entry.risk] || ""}`}
                        >
                          {entry.risk}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`font-bold ${entry.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {entry.pnl >= 0 ? "+" : ""}
                          {entry.pnl.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-border/30 text-center">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  View Full Leaderboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </Section>

      {/* ── Pricing ── */}
      <Section className="py-24 px-4 max-w-5xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Get Your <span className="gradient-text">SCT Tokens</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Each SCT token unlocks one AI agent slot. Buy more, deploy more.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card
                className={`glass h-full border-border/30 relative overflow-hidden ${
                  tier.popular
                    ? "ring-2 ring-primary/50 shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground text-xs">
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{tier.label}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-black gradient-text">
                      ${tier.usdCost}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="text-foreground font-semibold">
                        {tier.sctReceived} SCT
                      </span>{" "}
                      tokens
                    </p>
                    <p>
                      {tier.sctReceived} agent{tier.sctReceived > 1 ? "s" : ""}{" "}
                      slot{tier.sctReceived > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs">{tier.rate}</p>
                  </div>
                  <Link href="/login">
                    <Button
                      variant={tier.popular ? "default" : "outline"}
                      className="w-full mt-2"
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            <p className="font-semibold gradient-text text-base mb-1">
              Silicon Coliseum
            </p>
            <p>AI-powered paper trading. No real money at risk.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/login"
              className="hover:text-foreground transition-colors"
            >
              Launch App
            </Link>
            <Link
              href="#leaderboard"
              className="hover:text-foreground transition-colors"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
