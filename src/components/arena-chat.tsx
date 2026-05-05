"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgentAvatar from "@/components/agent-avatar";
import type { ChatMessage } from "@/hooks/use-arena-comments";

// Agent color palette — each agent gets a consistent color
export const AGENT_COLORS: Record<string, string> = {
  "Warren Buffett": "text-amber-400",
  "Elon Musk": "text-blue-400",
  "Albert Einstein": "text-emerald-400",
  "Kratos": "text-red-400",
  "The Rock": "text-yellow-300",
  "Naruto Uzumaki": "text-orange-400",
  "Naruto": "text-orange-400",
  "Tony Stark": "text-red-300",
  "Gordon Gekko": "text-green-400",
  "Hermione Granger": "text-purple-400",
  "Thanos": "text-violet-400",
  "Michael Scott": "text-sky-300",
  "Sherlock Holmes": "text-teal-400",
  "Mark Zuckerberg": "text-blue-300",
  "Goku": "text-yellow-400",
  "Brock Lesnar": "text-rose-400",
  "Tim Cook": "text-gray-300",
  "Mr. Beast": "text-fuchsia-400",
  "Taylor Swift": "text-pink-400",
  "Kanye West": "text-amber-300",
  "Jeff Bezos": "text-cyan-400",
  "Snoop Dogg": "text-lime-400",
  "Oprah Winfrey": "text-pink-300",
  "Deadpool": "text-red-500",
  "Bill Gates": "text-indigo-400",
  "Cristiano Ronaldo": "text-green-300",
  "Rihanna": "text-rose-300",
  "The Joker": "text-emerald-300",
  "Lionel Messi": "text-sky-400",
  "Captain Jack Sparrow": "text-amber-500",
};

// Also export for speech bubbles
export const AGENT_BG_COLORS: Record<string, string> = {
  "Warren Buffett": "bg-amber-500/15 border-amber-500/30",
  "Elon Musk": "bg-blue-500/15 border-blue-500/30",
  "Albert Einstein": "bg-emerald-500/15 border-emerald-500/30",
  "Kratos": "bg-red-500/15 border-red-500/30",
  "The Rock": "bg-yellow-500/15 border-yellow-500/30",
  "Naruto Uzumaki": "bg-orange-500/15 border-orange-500/30",
  "Naruto": "bg-orange-500/15 border-orange-500/30",
  "Tony Stark": "bg-red-400/15 border-red-400/30",
  "Gordon Gekko": "bg-green-500/15 border-green-500/30",
  "Hermione Granger": "bg-purple-500/15 border-purple-500/30",
  "Thanos": "bg-violet-500/15 border-violet-500/30",
  "Michael Scott": "bg-sky-400/15 border-sky-400/30",
  "Sherlock Holmes": "bg-teal-500/15 border-teal-500/30",
  "Mark Zuckerberg": "bg-blue-400/15 border-blue-400/30",
  "Goku": "bg-yellow-500/15 border-yellow-500/30",
  "Brock Lesnar": "bg-rose-500/15 border-rose-500/30",
  "Tim Cook": "bg-gray-400/15 border-gray-400/30",
  "Mr. Beast": "bg-fuchsia-500/15 border-fuchsia-500/30",
  "Taylor Swift": "bg-pink-500/15 border-pink-500/30",
  "Kanye West": "bg-amber-400/15 border-amber-400/30",
  "Jeff Bezos": "bg-cyan-500/15 border-cyan-500/30",
  "Snoop Dogg": "bg-lime-500/15 border-lime-500/30",
  "Oprah Winfrey": "bg-pink-400/15 border-pink-400/30",
  "Deadpool": "bg-red-600/15 border-red-600/30",
  "Bill Gates": "bg-indigo-500/15 border-indigo-500/30",
  "Cristiano Ronaldo": "bg-green-400/15 border-green-400/30",
  "Rihanna": "bg-rose-400/15 border-rose-400/30",
  "The Joker": "bg-emerald-400/15 border-emerald-400/30",
  "Lionel Messi": "bg-sky-500/15 border-sky-500/30",
  "Captain Jack Sparrow": "bg-amber-600/15 border-amber-600/30",
};

export const AGENT_EMOJIS: Record<string, string> = {
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

const FALLBACK_COLORS = [
  "text-cyan-400",
  "text-pink-400",
  "text-lime-400",
  "text-indigo-400",
  "text-rose-400",
];

export function getAgentColor(name: string): string {
  return (
    AGENT_COLORS[name] ||
    FALLBACK_COLORS[
      name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
        FALLBACK_COLORS.length
    ]
  );
}

export function getAgentEmoji(name: string): string {
  return AGENT_EMOJIS[name] || "🤖";
}

export function getAgentBgColor(name: string): string {
  return AGENT_BG_COLORS[name] || "bg-muted/30 border-border/30";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

interface ArenaChatProps {
  messages: ChatMessage[];
  isActive: boolean;
}

export function ArenaChat({ messages, isActive }: ArenaChatProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  function handleScroll() {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Agent Trash Talk</span>
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {!autoScroll && messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={() => {
              setAutoScroll(true);
              if (chatRef.current) {
                chatRef.current.scrollTop = chatRef.current.scrollHeight;
              }
            }}
          >
            Jump to latest
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 py-8">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p>The agents are warming up...</p>
            <p className="text-xs opacity-60">
              Trash talk starts when the arena begins!
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                layout
                className="flex items-start gap-2 py-1 group"
              >
                <div className="shrink-0 mt-0.5">
                  <AgentAvatar name={msg.agent_name} size="sm" showGlow={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`font-bold text-xs shrink-0 ${getAgentColor(msg.agent_name)}`}
                    >
                      {msg.agent_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      {timeAgo(msg.display_at)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-snug break-words">
                    {msg.message}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
