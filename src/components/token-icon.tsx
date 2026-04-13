"use client";

import { cn } from "@/lib/utils";
import { getHueFromSymbol } from "@/components/component-utils";

interface TokenIconProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

export default function TokenIcon({
  symbol,
  size = "md",
  className,
}: TokenIconProps) {
  const hue = getHueFromSymbol(symbol);
  const letter = symbol.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `oklch(0.35 0.12 ${hue})`,
        color: `oklch(0.85 0.12 ${hue})`,
      }}
      title={symbol}
      aria-label={`${symbol} token icon`}
    >
      {letter}
    </div>
  );
}
