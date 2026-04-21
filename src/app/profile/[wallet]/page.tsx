"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Swords,
  TrendingUp,
  BarChart3,
  Star,
  Wallet,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProfileData {
  user: {
    id: string;
    username: string;
    wallet_address: string;
    created_at: string;
  };
  profile: {
    total_arenas: number;
    wins: number;
    top3_finishes: number;
    best_pnl: number;
    total_trades: number;
    reputation: number;
  };
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function ProfilePage() {
  const params = useParams();
  const wallet = params.wallet as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/users/${wallet}/profile`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("User not found");
          throw new Error("Failed to fetch profile");
        }
        const profileData = await res.json();
        setData(profileData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [wallet]);

  function handleCopyAddress() {
    if (!data) return;
    navigator.clipboard.writeText(data.user.wallet_address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mesh-gradient absolute inset-0" />
        <div className="z-10 text-center space-y-4">
          <p className="text-destructive text-lg">{error || "Profile not found"}</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { user, profile } = data;

  const statCards = [
    {
      icon: Swords,
      label: "Total Arenas",
      value: profile.total_arenas.toString(),
      color: "text-blue-400",
    },
    {
      icon: Trophy,
      label: "Wins",
      value: profile.wins.toString(),
      color: "text-yellow-400",
    },
    {
      icon: TrendingUp,
      label: "Best P&L",
      value: `${profile.best_pnl >= 0 ? "+" : ""}${profile.best_pnl.toFixed(1)}%`,
      color: profile.best_pnl >= 0 ? "text-emerald-400" : "text-red-400",
    },
    {
      icon: BarChart3,
      label: "Total Trades",
      value: profile.total_trades.toLocaleString(),
      color: "text-purple-400",
    },
    {
      icon: Star,
      label: "Reputation",
      value: profile.reputation.toString(),
      color: "text-amber-400",
    },
    {
      icon: Trophy,
      label: "Top 3 Finishes",
      value: profile.top3_finishes.toString(),
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="mesh-gradient fixed inset-0 -z-10" />

      {/* Header */}
      <header className="glass border-b border-border/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold gradient-text">Player Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass border-border/30">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl font-bold">{user.username}</h2>
                  <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                    <Badge
                      variant="outline"
                      className="font-mono text-xs cursor-pointer hover:bg-accent transition-colors"
                      onClick={handleCopyAddress}
                    >
                      {truncateAddress(user.wallet_address)}
                      {copied ? (
                        <Check className="w-3 h-3 ml-1 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Member since {new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {profile.reputation > 0 && (
                  <div className="text-center shrink-0">
                    <div className="text-3xl font-bold gradient-text">{profile.reputation}</div>
                    <p className="text-xs text-muted-foreground">Reputation</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 gap-4"
        >
          {statCards.map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <Card className="glass border-border/30 glass-glow h-full">
                <CardContent className="p-5 text-center">
                  <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
