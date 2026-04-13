"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { getConfidenceColor } from "@/components/component-utils";

interface ConfidenceBarProps {
  value: number;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export default function ConfidenceBar({
  value,
  showLabel = true,
  animated = true,
  className,
}: ConfidenceBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  const colorClass = getConfidenceColor(clampedValue);

  const shouldAnimate = animated && isInView;

  return (
    <div ref={ref} className={cn("flex items-center gap-2", className)}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", colorClass)}
          initial={animated ? { width: "0%" } : { width: `${clampedValue}%` }}
          animate={
            shouldAnimate
              ? { width: `${clampedValue}%` }
              : animated
                ? { width: "0%" }
                : { width: `${clampedValue}%` }
          }
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[3ch] text-right text-xs font-medium text-muted-foreground tabular-nums">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
