"use client";

import { CELEBRITY_AGENTS } from "@/lib/celebrity-agents";

const AGENT_GRADIENTS: Record<string, { from: string; to: string; glow: string }> = {
  "Warren Buffett": { from: "#1e40af", to: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" },
  "Elon Musk": { from: "#ec4899", to: "#ef4444", glow: "rgba(236, 72, 153, 0.4)" },
  "Albert Einstein": { from: "#8b5cf6", to: "#6366f1", glow: "rgba(139, 92, 246, 0.4)" },
  "Kratos": { from: "#ea580c", to: "#dc2626", glow: "rgba(220, 38, 38, 0.4)" },
  "The Rock": { from: "#eab308", to: "#f59e0b", glow: "rgba(234, 179, 8, 0.4)" },
  "Naruto": { from: "#f97316", to: "#fbbf24", glow: "rgba(249, 115, 22, 0.4)" },
  "Naruto Uzumaki": { from: "#f97316", to: "#fbbf24", glow: "rgba(249, 115, 22, 0.4)" },
};

const AGENT_EMOJIS: Record<string, string> = {
  "Warren Buffett": "🧓",
  "Elon Musk": "🚀",
  "Albert Einstein": "🧠",
  "Kratos": "⚔️",
  "The Rock": "💪",
  "Naruto Uzumaki": "🍥",
  "Naruto": "🍥",
};

// Map celebrity names to their AI-generated avatar images
const CELEBRITY_AVATARS: Record<string, string> = {
  "Warren Buffett": "/avatars/warren-buffett.png",
  "Elon Musk": "/avatars/elon-musk.png",
  "Albert Einstein": "/avatars/albert-einstein.png",
  "Kratos": "/avatars/kratos.png",
  "The Rock": "/avatars/the-rock.png",
  "Naruto": "/avatars/naruto.png",
  "Naruto Uzumaki": "/avatars/naruto.png",
};

interface AgentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showGlow?: boolean;
}

const sizeMap = {
  sm: { container: "w-8 h-8", emoji: "text-sm", ring: "ring-1" },
  md: { container: "w-10 h-10", emoji: "text-lg", ring: "ring-2" },
  lg: { container: "w-14 h-14", emoji: "text-2xl", ring: "ring-2" },
  xl: { container: "w-20 h-20", emoji: "text-4xl", ring: "ring-3" },
};

export default function AgentAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
  showGlow = true,
}: AgentAvatarProps) {
  const gradient = AGENT_GRADIENTS[name] || {
    from: "#6366f1",
    to: "#8b5cf6",
    glow: "rgba(99, 102, 241, 0.4)",
  };
  const emoji = AGENT_EMOJIS[name] || "🤖";
  const s = sizeMap[size];

  // Use provided avatarUrl, or celebrity SVG, or fallback to gradient+emoji
  const imageUrl = avatarUrl || CELEBRITY_AVATARS[name];

  if (imageUrl) {
    return (
      <div
        className={`${s.container} rounded-full overflow-hidden ${s.ring} ring-white/20 shrink-0 ${className}`}
        style={
          showGlow
            ? { boxShadow: `0 0 20px ${gradient.glow}` }
            : undefined
        }
      >
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback: gradient circle with emoji
  return (
    <div
      className={`${s.container} rounded-full flex items-center justify-center shrink-0 ${s.ring} ring-white/20 relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        ...(showGlow ? { boxShadow: `0 0 20px ${gradient.glow}` } : {}),
      }}
    >
      <span className={`${s.emoji} relative z-10`} role="img" aria-label={name}>
        {emoji}
      </span>
      {/* Inner shine */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)",
        }}
      />
    </div>
  );
}

export { AGENT_EMOJIS, AGENT_GRADIENTS };
