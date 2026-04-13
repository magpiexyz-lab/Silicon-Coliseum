"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRiskLevelStyles, type RiskLevel } from "@/components/component-utils";

interface RiskLevelBadgeProps {
  level: RiskLevel;
  className?: string;
}

export default function RiskLevelBadge({ level, className }: RiskLevelBadgeProps) {
  const label = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium capitalize",
        getRiskLevelStyles(level),
        className
      )}
    >
      {label}
    </Badge>
  );
}
