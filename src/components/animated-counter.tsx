"use client";

import { useRef, useEffect } from "react";
import {
  useMotionValue,
  useSpring,
  useInView,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCounterValue, type CounterFormat } from "@/components/component-utils";

interface AnimatedCounterProps {
  value: number;
  format?: CounterFormat;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export default function AnimatedCounter({
  value,
  format = "number",
  prefix = "",
  suffix = "",
  duration = 2,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });

  const displayValue = useTransform(springValue, (latest) => {
    return formatCounterValue(
      Math.round(latest * 100) / 100,
      format,
      prefix,
      suffix
    );
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = displayValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest;
      }
    });

    return () => unsubscribe();
  }, [displayValue]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatCounterValue(0, format, prefix, suffix)}
    </span>
  );
}
