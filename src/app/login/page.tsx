"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import InteractiveParticles from "@/components/interactive-particles";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);

    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not installed. Please install it to continue.");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0]?.toLowerCase();
      if (!address) {
        setError("No account found. Please try again.");
        return;
      }

      // Check if registered
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });
      const data = await res.json();

      if (data.registered) {
        // Already registered — sign in
        const message = `Sign in to Silicon Coliseum\nWallet: ${address}\nTimestamp: ${Date.now()}`;
        const signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, address],
        });

        const signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: data.username,
            wallet_address: address,
            signature,
            message,
          }),
        });

        if (signupRes.ok) {
          router.push("/dashboard");
        } else {
          const err = await signupRes.json();
          setError(err.error || "Failed to sign in.");
        }
      } else {
        // Not registered — go to signup
        router.push(`/signup?wallet=${address}`);
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        setError("Connection rejected. Please try again.");
      } else {
        setError("Failed to connect. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  }

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
        <Card className="glass border-border/50">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
            >
              <Wallet className="w-8 h-8 text-primary" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">
                Connect Your Wallet
              </CardTitle>
              <CardDescription className="mt-2">
                Sign in with MetaMask to enter the arena
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Connect MetaMask
                </>
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

            {typeof window !== "undefined" && !window.ethereum && (
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have MetaMask?{" "}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Install it here
                </a>
              </p>
            )}

            <div className="pt-2 text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3 rotate-180" />
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
