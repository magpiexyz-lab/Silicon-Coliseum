"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SCTBalanceBadge({
  walletAddress,
}: {
  walletAddress: string;
}) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/sct/balance/${walletAddress}`)
      .then((r) => r.json())
      .then((d) => setBalance(d.balance ?? 0))
      .catch(() => setBalance(0));
  }, [walletAddress]);

  if (balance === null) return null;

  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-mono text-xs py-1 px-2 border-primary/30"
    >
      <Coins className="w-3 h-3 text-primary" />
      {balance} SCT
    </Badge>
  );
}
