"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Wallet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { createBuyCpInstruction, buildTransaction } from "@/lib/solana/program";
import { CP_PER_SOL, MIN_BET_SOL } from "@/lib/solana/constants";
import { solToLamports } from "@/lib/solana/utils";

interface BuyCpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyCpDialog({ open, onOpenChange }: BuyCpDialogProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { refreshUser } = useAuth();

  const [solAmount, setSolAmount] = useState("1");
  const [status, setStatus] = useState<"idle" | "signing" | "confirming" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const solNum = parseFloat(solAmount) || 0;
  const cpAmount = Math.floor(solNum * CP_PER_SOL);
  const isValid = solNum >= MIN_BET_SOL && cpAmount > 0;

  async function handleBuy() {
    if (!publicKey || !isValid) return;

    setError(null);
    setStatus("signing");

    try {
      const lamports = solToLamports(solNum);
      const instruction = await createBuyCpInstruction(publicKey, lamports);
      const tx = await buildTransaction(instruction, publicKey);

      setStatus("confirming");
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setStatus("verifying");
      const res = await fetch("/api/solana/buy-cp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txSignature: signature,
          walletAddress: publicKey.toBase58(),
          solAmount: Number(lamports),
          expectedCp: cpAmount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      setStatus("success");
      await refreshUser();
      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  }

  const presets = [
    { sol: 0.1, label: "0.1 SOL" },
    { sol: 0.5, label: "0.5 SOL" },
    { sol: 1, label: "1 SOL" },
    { sol: 5, label: "5 SOL" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Buy Coliseum Points
          </DialogTitle>
          <DialogDescription>
            Send SOL on Solana testnet to get CP. Rate: 1 SOL = {CP_PER_SOL.toLocaleString()} CP
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!publicKey ? (
            <div className="text-center space-y-3 py-4">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Connect your Solana wallet to buy CP
              </p>
              <Button onClick={() => setVisible(true)} className="gap-2">
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="sol-amount">SOL Amount</Label>
                <Input
                  id="sol-amount"
                  type="number"
                  step="0.1"
                  min={MIN_BET_SOL}
                  value={solAmount}
                  onChange={(e) => setSolAmount(e.target.value)}
                  placeholder="1.0"
                  className="text-lg font-mono"
                  disabled={status !== "idle" && status !== "error"}
                />
                <div className="flex gap-2">
                  {presets.map((p) => (
                    <Button
                      key={p.sol}
                      variant="outline"
                      size="sm"
                      onClick={() => setSolAmount(String(p.sol))}
                      className="flex-1 text-xs"
                      disabled={status !== "idle" && status !== "error"}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg glass">
                <span className="text-sm text-muted-foreground">You receive:</span>
                <span className="text-xl font-black text-primary">
                  {cpAmount.toLocaleString()} CP
                </span>
              </div>

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 text-primary font-semibold py-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {cpAmount.toLocaleString()} CP added to your account!
                  </motion.div>
                ) : (
                  <motion.div key="action" className="space-y-3">
                    <Button
                      onClick={handleBuy}
                      disabled={!isValid || (status !== "idle" && status !== "error")}
                      className="w-full h-11 font-semibold"
                      size="lg"
                    >
                      {status === "signing" && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sign in wallet...
                        </>
                      )}
                      {status === "confirming" && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Confirming on-chain...
                        </>
                      )}
                      {status === "verifying" && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Crediting CP...
                        </>
                      )}
                      {(status === "idle" || status === "error") && (
                        <>
                          Buy {cpAmount.toLocaleString()} CP for {solNum} SOL
                        </>
                      )}
                    </Button>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-xs text-center text-muted-foreground">
                Testnet SOL only. Get free SOL at{" "}
                <a
                  href="https://faucet.solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  faucet.solana.com
                </a>
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
