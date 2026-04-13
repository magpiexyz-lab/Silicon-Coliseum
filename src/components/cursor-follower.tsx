"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface CursorFollowerProps {
  className?: string;
}

export default function CursorFollower({ className }: CursorFollowerProps) {
  const [isPointerDevice, setIsPointerDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const cursorX = useMotionValue(-200);
  const cursorY = useMotionValue(-200);

  const springX = useSpring(cursorX, { damping: 25, stiffness: 150, mass: 0.5 });
  const springY = useSpring(cursorY, { damping: 25, stiffness: 150, mass: 0.5 });

  useEffect(() => {
    // Check for pointer device
    const pointerQuery = window.matchMedia("(pointer: fine)");
    setIsPointerDevice(pointerQuery.matches);

    const handlePointerChange = (e: MediaQueryListEvent) => {
      setIsPointerDevice(e.matches);
    };
    pointerQuery.addEventListener("change", handlePointerChange);

    // Check for reduced motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 100);
      cursorY.set(e.clientY - 100);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      pointerQuery.removeEventListener("change", handlePointerChange);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [cursorX, cursorY]);

  // Don't render on touch devices or when reduced motion is preferred
  if (!isPointerDevice || prefersReducedMotion) return null;

  return (
    <motion.div
      className={cn(
        "pointer-events-none fixed z-0 h-[200px] w-[200px] rounded-full",
        className
      )}
      style={{
        x: springX,
        y: springY,
        background:
          "radial-gradient(circle, oklch(0.72 0.19 165 / 0.12) 0%, oklch(0.72 0.19 165 / 0.04) 40%, transparent 70%)",
      }}
      aria-hidden="true"
    />
  );
}
