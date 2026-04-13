"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacityPhase: number;
  opacitySpeed: number;
}

interface InteractiveParticlesProps {
  count?: number;
  className?: string;
  connectLines?: boolean;
}

export default function InteractiveParticles({
  count = 80,
  className,
  connectLines = false,
}: InteractiveParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);
  const prefersReducedMotion = useRef(false);

  const initParticles = useCallback(
    (width: number, height: number) => {
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          radius: 1 + Math.random() * 2,
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          speedX: 0.002 + Math.random() * 0.005,
          speedY: 0.002 + Math.random() * 0.005,
          opacity: 0.2 + Math.random() * 0.6,
          opacityPhase: Math.random() * Math.PI * 2,
          opacitySpeed: 0.01 + Math.random() * 0.02,
        });
      }
      particlesRef.current = particles;
    },
    [count]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      initParticles(canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    let time = 0;

    const render = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      if (prefersReducedMotion.current) {
        // Static render - just draw particles at base positions
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.baseX, p.baseY, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `oklch(0.72 0.15 170 / 0.5)`;
          ctx.fill();
        }
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      time += 1;

      for (const p of particles) {
        // Organic sine/cosine float
        const floatX = Math.sin(time * p.speedX + p.phaseX) * 30;
        const floatY = Math.cos(time * p.speedY + p.phaseY) * 30;

        let targetX = p.baseX + floatX;
        let targetY = p.baseY + floatY;

        // Mouse repulsion
        const dx = targetX - mouse.x;
        const dy = targetY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repulsionRadius = 100;

        if (dist < repulsionRadius && dist > 0) {
          const force = (repulsionRadius - dist) / repulsionRadius;
          targetX += (dx / dist) * force * 50;
          targetY += (dy / dist) * force * 50;
        }

        // Lerp to target (drift back smoothly)
        p.x += (targetX - p.x) * 0.08;
        p.y += (targetY - p.y) * 0.08;

        // Opacity pulsing (0.2 - 0.8)
        p.opacityPhase += p.opacitySpeed;
        p.opacity = 0.2 + (Math.sin(p.opacityPhase) + 1) * 0.3;

        // Draw particle with emerald/teal color
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.72 0.15 ${165 + (p.phaseX * 10)} / ${p.opacity})`;
        ctx.fill();
      }

      // Connect lines between nearby particles
      if (connectLines) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 80) {
              const opacity = (1 - dist / 80) * 0.15;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `oklch(0.72 0.15 170 / ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, [count, connectLines, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-auto absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
    />
  );
}
