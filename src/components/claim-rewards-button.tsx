"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet, Loader2, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createClaimRewardInstruction,
  buildTransaction,
} from "@/lib/solana/program";
import { lamportsToSol } from "@/lib/solana/utils";

interface ClaimRewardsButtonProps {
  arenaId: string;
  rewardLamports: number;
  rewardId: string;
  onClaimed?: () => void;
}

export function ClaimRewardsButton({
  arenaId,
  rewardLamports,
  rewardId,
  onClaimed,
}: ClaimRewardsButtonProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [status, setStatus] = useState<"idle" | "signing" | "confirming" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const solAmount = lamportsToSol(rewardLamports);

  async function handleClaim() {
    if (!publicKey) return;

    setError(null);
    setStatus("signing");

    try {
      const instruction = await createClaimRewardInstruction(
        publicKey,
        arenaId
      );
      const tx = await buildTransaction(instruction, publicKey);

      setStatus("confirming");
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      // Notify backend
      await fetch("/api/solana/claim-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txSignature: signature,
          rewardId,
          walletAddress: publicKey.toBase58(),
        }),
      });

      setStatus("success");
      onClaimed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
      setStatus("error");
    }
  }

  if (!publicKey) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setVisible(true)}
        className="gap-1.5"
      >
        <Wallet className="w-3.5 h-3.5" />
        Connect to Claim {solAmount.toFixed(3)} SOL
      </Button>
    );
  }

  if (status === "success") {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1.5 text-primary">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {solAmount.toFixed(3)} SOL Claimed!
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={handleClaim}
        disabled={status !== "idle" && status !== "error"}
        size="sm"
        className="gap-1.5"
      >
        {status === "signing" || status === "confirming" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {status === "signing" ? "Sign..." : "Confirming..."}
          </>
        ) : (
          <>
            <Gift className="w-3.5 h-3.5" />
            Claim {solAmount.toFixed(3)} SOL
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
