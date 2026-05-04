"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPlaceBetInstruction, createAddBetInstruction, buildTransaction } from "@/lib/solana/program";
import { MIN_BET_SOL } from "@/lib/solana/constants";
import { solToLamports, getUserBetPDA, getArenaEscrowPDA } from "@/lib/solana/utils";

interface SolBetPanelProps {
  arenaId: string;
  agentId: string;
  agentName: string;
  onBetPlaced?: () => void;
}

export function SolBetPanel({
  arenaId,
  agentId,
  agentName,
  onBetPlaced,
}: SolBetPanelProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [solAmount, setSolAmount] = useState("0.1");
  const [status, setStatus] = useState<"idle" | "signing" | "confirming" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const solNum = parseFloat(solAmount) || 0;
  const isValid = solNum >= MIN_BET_SOL;

  async function handlePlaceBet() {
    if (!publicKey || !isValid) return;

    setError(null);
    setStatus("signing");

    try {
      const lamports = solToLamports(solNum);

      // Check if the arena escrow exists on-chain
      const [arenaEscrowPDA] = getArenaEscrowPDA(arenaId);
      const escrowAccount = await connection.getAccountInfo(arenaEscrowPDA);
      if (!escrowAccount) {
        throw new Error(
          "SOL betting is not available for this arena yet. The on-chain escrow has not been created."
        );
      }

      // Check if user already has a bet account for this arena
      const [userBetPDA] = getUserBetPDA(arenaEscrowPDA, publicKey);
      const existingBet = await connection.getAccountInfo(userBetPDA);

      const instruction = existingBet
        ? await createAddBetInstruction(publicKey, arenaId, lamports)
        : await createPlaceBetInstruction(publicKey, arenaId, lamports);
      const tx = await buildTransaction(instruction, publicKey);

      setStatus("confirming");
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setStatus("verifying");
      const res = await fetch("/api/solana/verify-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txSignature: signature,
          walletAddress: publicKey.toBase58(),
          arenaId,
          agentId,
          solAmount: Number(lamports),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      setStatus("success");
      onBetPlaced?.();
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  }

  if (!publicKey) {
    return (
      <div className="p-3 rounded-lg glass text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Connect wallet to bet with SOL
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisible(true)}
          className="gap-1.5"
        >
          <Wallet className="w-3.5 h-3.5" />
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg glass text-primary text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Bet of {solNum} SOL placed on {agentName}!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min={MIN_BET_SOL}
          value={solAmount}
          onChange={(e) => setSolAmount(e.target.value)}
          placeholder="SOL amount"
          className="font-mono text-sm flex-1"
          disabled={status !== "idle" && status !== "error"}
        />
        <Button
          onClick={handlePlaceBet}
          disabled={!isValid || (status !== "idle" && status !== "error")}
          size="sm"
          className="shrink-0"
        >
          {status === "signing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {status === "confirming" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {status === "verifying" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {(status === "idle" || status === "error") && "Bet SOL"}
        </Button>
      </div>
      {!isValid && solNum > 0 && (
        <p className="text-xs text-destructive">
          Minimum bet: {MIN_BET_SOL} SOL
        </p>
      )}
      {error && (
        <div className="flex items-start gap-1.5 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
