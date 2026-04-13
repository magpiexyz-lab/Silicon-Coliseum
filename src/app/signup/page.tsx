"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import InteractiveParticles from "@/components/interactive-particles";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletAddress = searchParams.get("wallet") || "";

  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid =
    username.length >= 2 &&
    username.length <= 30 &&
    /^[a-zA-Z0-9_]+$/.test(username);

  async function handleSignup() {
    if (!isValid || !walletAddress) return;
    setError(null);
    setIsSubmitting(true);

    try {
      if (!window.ethereum) {
        setError("MetaMask not found.");
        return;
      }

      const message = `Register on Silicon Coliseum\nUsername: ${username}\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      });

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          wallet_address: walletAddress,
          signature,
          message,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        setError("Signature rejected. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!walletAddress) {
    return (
      <Card className="glass border-border/50 w-full max-w-md">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No wallet address provided. Please connect your wallet first.
          </p>
          <Link href="/login">
            <Button>Connect Wallet</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 w-full max-w-md">
      <CardHeader className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
        >
          {success ? (
            <CheckCircle2 className="w-8 h-8 text-primary" />
          ) : (
            <UserPlus className="w-8 h-8 text-primary" />
          )}
        </motion.div>
        <div>
          <CardTitle className="text-2xl font-bold">
            {success ? "Welcome to the Arena!" : "Choose Your Username"}
          </CardTitle>
          <CardDescription className="mt-2">
            {success
              ? "Redirecting to your dashboard..."
              : `Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
          </CardDescription>
        </div>
      </CardHeader>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-6 pb-6"
          >
            <div className="flex justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="trader_supreme"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  autoComplete="off"
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  2-30 characters. Letters, numbers, and underscores only.
                </p>
              </div>

              <Button
                onClick={handleSignup}
                disabled={!isValid || isSubmitting}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing...
                  </>
                ) : (
                  "Sign & Register"
                )}
              </Button>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" />
                  Back to login
                </Link>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />
      <InteractiveParticles count={50} className="absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md px-4"
      >
        <Suspense
          fallback={
            <Card className="glass border-border/50 w-full max-w-md">
              <CardContent className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          }
        >
          <SignupForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
