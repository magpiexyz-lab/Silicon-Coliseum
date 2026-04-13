"use client";

import { useState, useCallback } from "react";
import { Copy, ExternalLink, LogOut, ChevronDown, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { truncateAddress } from "@/components/component-utils";

// Window.ethereum type is declared in src/app/login/page.tsx

interface WalletConnectButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

export default function WalletConnectButton({
  onConnect,
  onDisconnect,
  className,
}: WalletConnectButtonProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const connect = useCallback(async () => {
    if (!window.ethereum) return;

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts && accounts.length > 0) {
        const connectedAddress = accounts[0].toLowerCase();
        setAddress(connectedAddress);
        onConnect?.(connectedAddress);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      // User rejected the request
      if (message.includes("User rejected") || message.includes("4001")) {
        setError("Connection rejected");
      } else {
        setError(message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [onConnect]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
    onDisconnect?.();
  }, [onDisconnect]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard API failure
    }
  }, [address]);

  // No MetaMask installed
  if (typeof window !== "undefined" && !window.ethereum) {
    return (
      <Button variant="outline" asChild className={cn(className)}>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Install MetaMask
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </Button>
    );
  }

  // Not connected
  if (!address) {
    return (
      <div className={cn("flex flex-col items-start gap-1", className)}>
        <Button
          onClick={connect}
          disabled={isConnecting}
          variant="default"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect MetaMask
            </>
          )}
        </Button>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // Connected - show address with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("font-mono text-sm", className)}>
          {truncateAddress(address)}
          <ChevronDown className="ml-2 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Copied!" : "Copy Address"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://arbiscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Arbiscan
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
