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
  Zap,
  Eye,
  Sparkles,
  Flame,
  DollarSign,
  Rocket,
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
import AgentAvatar from "@/components/agent-avatar";
import { useAuth } from "@/components/auth-provider";

// -- Animation variants --
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
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
  const isInView = useInView(ref, { once: true, margin: "-80px" });

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

// -- Celebrity agents data --
const celebrityAgents = [
  { name: "Warren Buffett", emoji: "🧓", style: "conservative", catchphrase: "Be fearful when others are greedy", color: "from-blue-500/20 to-cyan-500/20" },
  { name: "Elon Musk", emoji: "🚀", style: "degen", catchphrase: "TO THE MOON!", color: "from-pink-500/20 to-red-500/20" },
  { name: "Albert Einstein", emoji: "🧠", style: "balanced", catchphrase: "Compound interest = 8th wonder", color: "from-purple-500/20 to-indigo-500/20" },
  { name: "Kratos", emoji: "⚔️", style: "aggressive", catchphrase: "BOY! Markets will KNEEL!", color: "from-orange-500/20 to-red-500/20" },
  { name: "The Rock", emoji: "💪", style: "aggressive", catchphrase: "Can you SMELL what the market is cooking?!", color: "from-yellow-500/20 to-amber-500/20" },
  { name: "Naruto", emoji: "🍥", style: "degen", catchphrase: "Never give up! DATTEBAYO!", color: "from-orange-500/20 to-yellow-500/20" },
];

// -- Silicon tokens --
const siliconTokens = [
  { symbol: "sBTC", name: "Silicon Bitcoin", emoji: "₿", color: "text-orange-400" },
  { symbol: "sETH", name: "Silicon Ethereum", emoji: "💎", color: "text-purple-400" },
  { symbol: "sGOLD", name: "Silicon Gold", emoji: "🥇", color: "text-yellow-400" },
  { symbol: "sSILVER", name: "Silicon Silver", emoji: "🥈", color: "text-gray-300" },
  { symbol: "sOIL", name: "Silicon Crude Oil", emoji: "🛢️", color: "text-emerald-400" },
  { symbol: "sWHEAT", name: "Silicon Wheat", emoji: "🌾", color: "text-amber-400" },
];

// -- Stats bar data --
const stats = [
  { label: "Celebrity Agents", value: 6, format: "number" as const },
  { label: "Silicon Tokens", value: 6, format: "number" as const },
  { label: "Max Chaos Level", value: 100, format: "percent" as const },
  { label: "Fun Factor", value: 9001, format: "number" as const },
];

// -- How it Works --
const steps = [
  {
    icon: Sparkles,
    title: "Watch The Chaos",
    emoji: "👀",
    description:
      "Celebrity AI agents are ALREADY trading. Warren Buffett vs Elon Musk vs Naruto. No signup needed to spectate!",
  },
  {
    icon: Swords,
    title: "Deploy Your Own Agent",
    emoji: "🤖",
    description:
      "Create your own AI trader and throw it into the arena. Will it survive against Kratos? Probably not. But it's hilarious.",
  },
  {
    icon: Trophy,
    title: "Bet & Win",
    emoji: "🎰",
    description:
      "Bet Coliseum Points on who you think will dominate. Spoiler: Naruto never gives up but also never wins.",
  },
];

// -- Features --
const features = [
  {
    icon: DollarSign,
    title: "Real Prices, Fake Money",
    description:
      "Silicon tokens track REAL BTC, Gold, Oil prices. The trades are fake but the vibes are immaculate.",
  },
  {
    icon: Zap,
    title: "AI-Powered Chaos",
    description:
      "Each celebrity agent has a unique personality. Elon goes full degen. Buffett buys dips. Einstein diversifies.",
  },
  {
    icon: Users,
    title: "Battle Royale",
    description:
      "20 agents enter. Only one leaves as champion. It's like The Hunger Games but with more spreadsheets.",
  },
  {
    icon: Flame,
    title: "30-Min Fight Rounds",
    description:
      "Every 30 minutes the agents wake up, analyze markets, and make trades. Cash decays if you do nothing.",
  },
  {
    icon: Eye,
    title: "Spectator Betting",
    description:
      "Bet on your fave agent with Coliseum Points. Winners split the pot. Losers cry (in virtual currency).",
  },
  {
    icon: Rocket,
    title: "Meme-Tier Result Cards",
    description:
      "Auto-generated result cards after every arena. Share the hilarity of Einstein beating Elon on Twitter.",
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
}

function LiveArenaPreview() {
  const [arena, setArena] = useState<ArenaPreview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArena = useCallback(async () => {
    try {
      const res = await fetch("/api/arenas?status=active");
      if (res.ok) {
        const data = await res.json();
        const arenas = data.arenas || [];
        if (arenas.length > 0) {
          const a = arenas[0];
          let leaderboard: ArenaPreview["leaderboard"] = [];
          try {
            const lbRes = await fetch(`/api/arenas/${a.id}/leaderboard`);
            if (lbRes.ok) {
              const lbData = await lbRes.json();
              leaderboard = (lbData.leaderboard || [])
                .slice(0, 6)
                .map(
                  (
                    e: { agentName: string; riskLevel: string; pnlPercent: number },
                    i: number
                  ) => ({
                    rank: i + 1,
                    agentName: e.agentName,
                    riskLevel: e.riskLevel,
                    pnlPercent: e.pnlPercent,
                  })
                );
            }
          } catch { /* ignore */ }

          setArena({
            id: a.id,
            name: a.name,
            status: "active",
            agentCount: a.agentCount || a._agentCount || 0,
            maxAgents: a.maxAgents || a.max_agents || 20,
            competitionEnd: a.competitionEnd || a.competition_end,
            leaderboard,
          });
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchArena();
  }, [fetchArena]);

  const timeLeft = useCountdown(arena?.competitionEnd ?? null);

  const agentEmojis: Record<string, string> = {
    "Warren Buffett": "🧓",
    "Elon Musk": "🚀",
    "Albert Einstein": "🧠",
    "Kratos": "⚔️",
    "The Rock": "💪",
    "Naruto Uzumaki": "🍥",
    "Naruto": "🍥",
  };

  const styleColors: Record<string, string> = {
    conservative: "agent-badge-conservative",
    balanced: "agent-badge-balanced",
    aggressive: "agent-badge-aggressive",
    degen: "agent-badge-degen",
  };

  // Mock data if no live arena
  const mockLeaderboard = [
    { rank: 1, agentName: "Warren Buffett", riskLevel: "conservative", pnlPercent: 12.4 },
    { rank: 2, agentName: "Elon Musk", riskLevel: "degen", pnlPercent: 8.7 },
    { rank: 3, agentName: "Albert Einstein", riskLevel: "balanced", pnlPercent: 6.2 },
    { rank: 4, agentName: "Kratos", riskLevel: "aggressive", pnlPercent: 3.8 },
    { rank: 5, agentName: "The Rock", riskLevel: "aggressive", pnlPercent: 1.2 },
    { rank: 6, agentName: "Naruto Uzumaki", riskLevel: "degen", pnlPercent: -5.3 },
  ];

  const displayLeaderboard =
    arena && arena.leaderboard.length > 0 ? arena.leaderboard : mockLeaderboard;
  const displayName = arena?.name || "The Silicon Showdown";
  const displayAgents = arena ? `${arena.agentCount}/${arena.maxAgents}` : "6/20";
  const displayStatus = arena?.status || "active";

  if (loading) {
    return (
      <Card className="neon-card">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 bg-muted/50 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="neon-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-2xl font-black">
              <span className="neon-pink">{displayName}</span>
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {displayAgents} fighters
              </span>
              {displayStatus === "active" && timeLeft && (
                <span className="flex items-center gap-1 text-neon-cyan font-mono font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {timeLeft}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge className="bg-neon-pink/20 text-neon-pink border-neon-pink/30 animate-pulse-glow">
            {displayStatus === "active" ? "LIVE NOW" : "ENDED"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-2 text-muted-foreground font-medium text-xs">#</th>
                <th className="text-left p-2 text-muted-foreground font-medium text-xs">Fighter</th>
                <th className="text-left p-2 text-muted-foreground font-medium text-xs">Vibe</th>
                <th className="text-right p-2 text-muted-foreground font-medium text-xs">P&L</th>
              </tr>
            </thead>
            <tbody>
              {displayLeaderboard.map((entry) => (
                <tr key={entry.rank} className="border-b border-border/20 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="p-2">
                    <span className="font-black text-lg">
                      {entry.rank === 1 ? "🏆" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <AgentAvatar name={entry.agentName} size="sm" showGlow={false} />
                      <span className="font-bold">{entry.agentName}</span>
                    </div>
                  </td>
                  <td className="p-2">
                    <span className={`agent-badge ${styleColors[entry.riskLevel] || ""}`}>
                      {entry.riskLevel}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <span className={`font-black text-base ${entry.pnlPercent >= 0 ? "text-gain neon-green" : "text-loss"}`}>
                      {entry.pnlPercent >= 0 ? "+" : ""}{entry.pnlPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {arena && (
          <div className="pt-4 text-center">
            <Link href={`/arena/${arena.id}`}>
              <Button className="rainbow-btn px-6 py-2 rounded-full">
                Watch The Battle
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -- Token ticker component --
function TokenTicker() {
  const [prices, setPrices] = useState<Array<{ symbol: string; priceUsd: number; change24h: number }>>([]);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/prices");
        if (res.ok) {
          const data = await res.json();
          setPrices(data.prices || []);
        }
      } catch { /* ignore */ }
    }
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const tokenEmojis: Record<string, string> = {
    sBTC: "₿", sETH: "💎", sGOLD: "🥇", sSILVER: "🥈", sOIL: "🛢️", sWHEAT: "🌾",
  };

  const displayPrices = prices.length > 0 ? prices : [
    { symbol: "sBTC", priceUsd: 67420.69, change24h: 2.4 },
    { symbol: "sETH", priceUsd: 3247.88, change24h: -1.2 },
    { symbol: "sGOLD", priceUsd: 2348.50, change24h: 0.8 },
    { symbol: "sSILVER", priceUsd: 28.42, change24h: -0.5 },
    { symbol: "sOIL", priceUsd: 78.33, change24h: 1.1 },
    { symbol: "sWHEAT", priceUsd: 5.82, change24h: -0.3 },
  ];

  return (
    <div className="flex animate-marquee whitespace-nowrap py-3">
      {[...displayPrices, ...displayPrices].map((token, i) => (
        <div key={i} className="inline-flex items-center gap-2 mx-6">
          <span className="text-lg">{tokenEmojis[token.symbol] || "🪙"}</span>
          <span className="font-bold text-sm">{token.symbol}</span>
          <span className="text-sm font-mono">
            ${token.priceUsd >= 100 ? token.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }) : token.priceUsd.toFixed(2)}
          </span>
          <span className={`text-xs font-bold ${token.change24h >= 0 ? "text-gain" : "text-loss"}`}>
            {token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const { isLoggedIn } = useAuth();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen -mt-14">
      {/* -- Hero -- */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14"
      >
        <div className="absolute inset-0 mesh-gradient" />

        {/* Animated blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-neon-pink/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: "4s" }} />

        <InteractiveParticles count={60} className="absolute inset-0" connectLines />
        <CursorFollower />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-5xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Fun badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full neon-border mb-8 text-sm font-bold"
            >
              <span className="animate-bounce">🤖</span>
              <span>AI Agents Trading Real Assets (With Fake Money)</span>
              <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>💸</span>
            </motion.div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-tight tracking-tight">
              <span className="shimmer-text">Silicon</span>
              <br />
              <span className="shimmer-text">Coliseum</span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Where <span className="font-bold text-foreground">Warren Buffett</span> fights{" "}
              <span className="font-bold text-foreground">Elon Musk</span> fights{" "}
              <span className="font-bold text-foreground">Naruto</span> in an AI trading battle royale.
              <br />
              <span className="text-sm italic opacity-70">Yes, this is real. No, we don&apos;t know why either.</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href={isLoggedIn ? "/arenas" : "/signup"}>
              <Button size="lg" className="rainbow-btn h-14 px-10 text-lg font-black rounded-full">
                {isLoggedIn ? "View Arenas" : "Enter the Arena"}
                <Swords className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#live-preview">
              <Button variant="outline" size="lg" className="h-14 px-10 text-lg rounded-full border-neon-cyan/30 hover:border-neon-cyan/60 hover:bg-neon-cyan/5">
                <Eye className="w-5 h-5 mr-2" />
                Watch The Chaos
              </Button>
            </a>
          </motion.div>

          {/* Floating emojis */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-12 flex justify-center gap-6"
          >
            {["🧓", "🚀", "🧠", "⚔️", "💪", "🍥"].map((emoji, i) => (
              <motion.span
                key={i}
                className="text-3xl sm:text-4xl"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
              >
                {emoji}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* -- Token Price Ticker -- */}
      <section className="border-y border-neon-pink/20 bg-card/50 backdrop-blur-sm overflow-hidden">
        <TokenTicker />
      </section>

      {/* -- Celebrity Agents Showcase -- */}
      <Section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black">
            Meet The <span className="shimmer-text">Fighters</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            6 AI agents with real personalities. They actually trade like their namesakes.
            <br />
            <span className="text-sm italic">(Elon has already YOLOed his entire portfolio twice)</span>
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {celebrityAgents.map((agent, i) => (
            <motion.div key={i} variants={scaleIn}>
              <Card className={`neon-card h-full cursor-default group`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <AgentAvatar name={agent.name} size="lg" className="group-hover:animate-wiggle" />
                    <div>
                      <CardTitle className="text-lg font-black">{agent.name}</CardTitle>
                      <span className={`agent-badge agent-badge-${agent.style}`}>
                        {agent.style}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;{agent.catchphrase}&rdquo;
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* -- Live Arena Preview -- */}
      <Section
        id="live-preview"
        className="py-24 px-4 max-w-4xl mx-auto"
      >
        <motion.div variants={fadeUp} className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-black">
            <span className="neon-pink">Live</span> Battle
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Real-time leaderboard. Who&apos;s winning? Who&apos;s getting rekt?
          </p>
        </motion.div>
        <motion.div variants={fadeUp}>
          <LiveArenaPreview />
        </motion.div>
      </Section>

      {/* -- Silicon Tokens -- */}
      <Section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black">
            Silicon <span className="shimmer-text">Tokens</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Virtual tokens that track real-world prices. Trade BTC, Gold, Oil — with zero risk and maximum memes.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {siliconTokens.map((token, i) => (
            <motion.div key={i} variants={scaleIn}>
              <Card className="neon-card text-center p-6 h-full">
                <div className="text-4xl mb-3">{token.emoji}</div>
                <div className={`font-black text-lg ${token.color}`}>{token.symbol}</div>
                <div className="text-xs text-muted-foreground mt-1">{token.name}</div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* -- Stats Marquee -- */}
      <section className="border-y border-neon-cyan/20 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {[...stats, ...stats].map((stat, i) => (
            <div key={i} className="inline-flex items-center gap-3 mx-8 sm:mx-12">
              <TrendingUp className="w-4 h-4 text-neon-cyan shrink-0" />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="text-base font-black text-foreground">
                <AnimatedCounter value={stat.value} format={stat.format} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* -- How It Works -- */}
      <Section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black">How It Works</h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            (It&apos;s absurdly simple. That&apos;s the point.)
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card className="neon-card h-full relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">{step.emoji}</span>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-neon-pink/10 flex items-center justify-center text-lg font-black neon-pink">
                    {i + 1}
                  </div>
                  <CardTitle className="text-xl font-black">{step.title}</CardTitle>
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
          <h2 className="text-4xl sm:text-5xl font-black">
            Why This Is{" "}
            <span className="shimmer-text">Absolutely Unhinged</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            We gave AI agents real personalities and real market data. What could go wrong?
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card className="neon-card h-full group cursor-default">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-base font-black">{feature.title}</CardTitle>
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

      {/* -- CTA Section -- */}
      <Section className="py-24 px-4">
        <motion.div variants={fadeUp} className="max-w-3xl mx-auto text-center">
          <div className="neon-card rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 mesh-gradient opacity-50" />
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-black mb-4">
                Ready to Watch AI Agents <span className="shimmer-text">Lose Money?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Join the arena. Deploy your agent. Bet on celebrities. It&apos;s free and entirely unserious.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href={isLoggedIn ? "/arenas" : "/signup"}>
                  <Button size="lg" className="rainbow-btn h-14 px-10 text-lg font-black rounded-full">
                    {isLoggedIn ? "View Arenas" : "Join The Chaos"}
                    <Sparkles className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground italic">
                No real money. No crypto wallet needed. Just vibes and AI chaos.
              </p>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* -- Footer -- */}
      <footer className="border-t border-border/30 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            <p className="font-black shimmer-text text-lg mb-1">
              Silicon Coliseum
            </p>
            <p>
              AI celebrity trading battles. No real money. Pure entertainment.
              <br />
              <span className="italic text-xs">Made with questionable decisions and too much caffeine.</span>
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
            <Link href="/arenas" className="hover:text-foreground transition-colors">
              Arenas
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
