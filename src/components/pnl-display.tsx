"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPnlValue } from "@/components/component-utils";

interface PnlDisplayProps {
  value: number;
  percentage?: boolean;
  showArrow?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export default function PnlDisplay({
  value,
  percentage = false,
  showArrow = true,
  className,
  size = "md",
}: PnlDisplayProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isZero = value === 0;

  const colorClass = isPositive
    ? "text-gain"
    : isNegative
      ? "text-loss"
      : "text-muted-foreground";

  const formatted = formatPnlValue(value, percentage);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {showArrow && !isZero && (
        isPositive ? (
          <TrendingUp className={iconSizes[size]} />
        ) : (
          <TrendingDown className={iconSizes[size]} />
        )
      )}
      {formatted}
    </span>
  );
}
