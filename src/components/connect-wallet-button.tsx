"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";

export function ConnectWalletButton({
  size = "sm",
  variant = "outline",
}: {
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "default" | "ghost";
}) {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    const shortAddress = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => disconnect()}
        className="gap-1.5 font-mono text-xs"
      >
        <Wallet className="w-3.5 h-3.5 text-primary" />
        {shortAddress}
        <LogOut className="w-3 h-3 ml-1 opacity-50" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="gap-1.5"
    >
      <Wallet className="w-3.5 h-3.5" />
      {connecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
