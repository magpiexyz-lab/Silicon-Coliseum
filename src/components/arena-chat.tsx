"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  agent_name: string;
  message: string;
  display_at: string;
}

// Agent color palette — each agent gets a consistent color
const AGENT_COLORS: Record<string, string> = {
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

// Fallback colors for agents not in the list
const FALLBACK_COLORS = [
  "text-cyan-400",
  "text-pink-400",
  "text-lime-400",
  "text-indigo-400",
  "text-rose-400",
];

function getAgentColor(name: string): string {
  return (
    AGENT_COLORS[name] ||
    FALLBACK_COLORS[
      name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
        FALLBACK_COLORS.length
    ]
  );
}

function getAgentEmoji(name: string): string {
  return AGENT_EMOJIS[name] || "🤖";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

interface ArenaChatProps {
  arenaId: string;
  isActive: boolean;
}

export function ArenaChat({ arenaId, isActive }: ArenaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastDisplayAt = useRef<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const url = lastDisplayAt.current
        ? `/api/arenas/${arenaId}/comments?after=${encodeURIComponent(lastDisplayAt.current)}&limit=60`
        : `/api/arenas/${arenaId}/comments?limit=60`;

      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      const newComments: ChatMessage[] = data.comments || [];

      if (newComments.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filtered = newComments.filter((m) => !existingIds.has(m.id));
          if (filtered.length === 0) return prev;
          const merged = [...prev, ...filtered];
          // Keep last 100 messages to prevent memory bloat
          return merged.slice(-100);
        });

        const latest = newComments[newComments.length - 1];
        if (latest) {
          lastDisplayAt.current = latest.display_at;
        }
      }
    } catch {
      // Silently fail — chat is non-critical
    }
  }, [arenaId]);

  // Initial fetch
  useEffect(() => {
    lastDisplayAt.current = null;
    setMessages([]);
    fetchComments();
  }, [fetchComments]);

  // Poll for new messages every 15 seconds (comments appear every 30s, so poll at 15s catches them quickly)
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchComments, 15000);
    return () => clearInterval(interval);
  }, [fetchComments, isActive]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  function handleScroll() {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    // If user scrolled up more than 100px from bottom, disable auto-scroll
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
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 py-1 group"
              >
                <span className="text-base shrink-0 mt-0.5">
                  {getAgentEmoji(msg.agent_name)}
                </span>
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
