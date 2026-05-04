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
  "Tony Stark": { from: "#dc2626", to: "#f59e0b", glow: "rgba(220, 38, 38, 0.4)" },
  "Gordon Gekko": { from: "#16a34a", to: "#065f46", glow: "rgba(22, 163, 74, 0.4)" },
  "Hermione Granger": { from: "#9333ea", to: "#7c3aed", glow: "rgba(147, 51, 234, 0.4)" },
  "Thanos": { from: "#7c3aed", to: "#4c1d95", glow: "rgba(124, 58, 237, 0.4)" },
  "Michael Scott": { from: "#0ea5e9", to: "#38bdf8", glow: "rgba(14, 165, 233, 0.4)" },
  "Sherlock Holmes": { from: "#14b8a6", to: "#0d9488", glow: "rgba(20, 184, 166, 0.4)" },
  "Mark Zuckerberg": { from: "#3b82f6", to: "#2563eb", glow: "rgba(59, 130, 246, 0.4)" },
  "Goku": { from: "#eab308", to: "#f97316", glow: "rgba(234, 179, 8, 0.4)" },
  "Brock Lesnar": { from: "#f43f5e", to: "#e11d48", glow: "rgba(244, 63, 94, 0.4)" },
  "Tim Cook": { from: "#6b7280", to: "#9ca3af", glow: "rgba(107, 114, 128, 0.4)" },
  "Mr. Beast": { from: "#d946ef", to: "#a855f7", glow: "rgba(217, 70, 239, 0.4)" },
  "Taylor Swift": { from: "#ec4899", to: "#f472b6", glow: "rgba(236, 72, 153, 0.4)" },
  "Kanye West": { from: "#d97706", to: "#f59e0b", glow: "rgba(217, 119, 6, 0.4)" },
  "Jeff Bezos": { from: "#06b6d4", to: "#22d3ee", glow: "rgba(6, 182, 212, 0.4)" },
  "Snoop Dogg": { from: "#84cc16", to: "#65a30d", glow: "rgba(132, 204, 22, 0.4)" },
  "Oprah Winfrey": { from: "#f472b6", to: "#ec4899", glow: "rgba(244, 114, 182, 0.4)" },
  "Deadpool": { from: "#dc2626", to: "#991b1b", glow: "rgba(220, 38, 38, 0.4)" },
  "Bill Gates": { from: "#6366f1", to: "#4f46e5", glow: "rgba(99, 102, 241, 0.4)" },
  "Cristiano Ronaldo": { from: "#22c55e", to: "#16a34a", glow: "rgba(34, 197, 94, 0.4)" },
  "Rihanna": { from: "#fb7185", to: "#f43f5e", glow: "rgba(251, 113, 133, 0.4)" },
  "The Joker": { from: "#10b981", to: "#059669", glow: "rgba(16, 185, 129, 0.4)" },
  "Lionel Messi": { from: "#0ea5e9", to: "#0284c7", glow: "rgba(14, 165, 233, 0.4)" },
  "Captain Jack Sparrow": { from: "#d97706", to: "#92400e", glow: "rgba(217, 119, 6, 0.4)" },
};

const AGENT_EMOJIS: Record<string, string> = {
  "Warren Buffett": "🧓",
  "Elon Musk": "🚀",
  "Albert Einstein": "🧠",
  "Kratos": "⚔️",
  "The Rock": "💪",
  "Naruto Uzumaki": "🍥",
  "Naruto": "🍥",
  "Tony Stark": "🦾",
  "Gordon Gekko": "🦈",
  "Hermione Granger": "📚",
  "Thanos": "🟣",
  "Michael Scott": "🏢",
  "Sherlock Holmes": "🔍",
  "Mark Zuckerberg": "👤",
  "Goku": "🐉",
  "Brock Lesnar": "🐻",
  "Tim Cook": "🍎",
  "Mr. Beast": "🎬",
  "Taylor Swift": "🎤",
  "Kanye West": "🎵",
  "Jeff Bezos": "📦",
  "Snoop Dogg": "🐶",
  "Oprah Winfrey": "✨",
  "Deadpool": "🎭",
  "Bill Gates": "💻",
  "Cristiano Ronaldo": "⚽",
  "Rihanna": "💎",
  "The Joker": "🃏",
  "Lionel Messi": "🐐",
  "Captain Jack Sparrow": "🏴‍☠️",
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
  "Tony Stark": "/avatars/tony-stark.png",
  "Gordon Gekko": "/avatars/gordon-gekko.png",
  "Hermione Granger": "/avatars/hermione-granger.png",
  "Thanos": "/avatars/thanos.png",
  "Michael Scott": "/avatars/michael-scott.png",
  "Sherlock Holmes": "/avatars/sherlock-holmes.png",
  "Mark Zuckerberg": "/avatars/mark-zuckerberg.png",
  "Goku": "/avatars/goku.png",
  "Brock Lesnar": "/avatars/brock-lesnar.png",
  "Tim Cook": "/avatars/tim-cook.png",
  "Mr. Beast": "/avatars/mr-beast.png",
  "Taylor Swift": "/avatars/taylor-swift.png",
  "Kanye West": "/avatars/kanye-west.png",
  "Jeff Bezos": "/avatars/jeff-bezos.png",
  "Snoop Dogg": "/avatars/snoop-dogg.png",
  "Oprah Winfrey": "/avatars/oprah-winfrey.png",
  "Deadpool": "/avatars/deadpool.png",
  "Bill Gates": "/avatars/bill-gates.png",
  "Cristiano Ronaldo": "/avatars/cristiano-ronaldo.png",
  "Rihanna": "/avatars/rihanna.png",
  "The Joker": "/avatars/the-joker.png",
  "Lionel Messi": "/avatars/lionel-messi.png",
  "Captain Jack Sparrow": "/avatars/captain-jack-sparrow.png",
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
