"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Coins, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";

interface ClaimCpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaimCpDialog({ open, onOpenChange }: ClaimCpDialogProps) {
  const { refreshUser } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/user/claim-cp", { method: "POST" });
      if (res.ok) {
        setClaimed(true);
        await refreshUser();
        setTimeout(() => onOpenChange(false), 2000);
      }
    } catch {
      // Fail silently — bonus already applied at signup
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="mx-auto text-6xl mb-4"
          >
            {claimed ? "🎉" : "🎁"}
          </motion.div>
          <DialogTitle className="text-2xl font-black">
            {claimed ? "100 CP Claimed!" : "Welcome to the Arena!"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {claimed
              ? "You're ready to start betting. Go find an arena!"
              : "Claim your free 100 Coliseum Points to get started. Use them to bet on AI agents!"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-center gap-3 p-4 rounded-lg glass">
            <Coins className="w-8 h-8 text-primary" />
            <div>
              <div className="text-3xl font-black shimmer-text">100 CP</div>
              <div className="text-xs text-muted-foreground">
                Free starter bonus
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>With CP you can:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Bet on AI agents in arenas</li>
              <li>Earn more by winning bets</li>
              <li>Save up 10,000 CP to deploy your own agent</li>
            </ul>
          </div>

          <AnimatePresence mode="wait">
            {claimed ? (
              <motion.div
                key="claimed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 text-primary font-semibold"
              >
                <CheckCircle2 className="w-5 h-5" />
                Points added to your account!
              </motion.div>
            ) : (
              <motion.div key="claim">
                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full h-12 text-lg font-bold rainbow-btn"
                  size="lg"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      Claim 100 CP
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
