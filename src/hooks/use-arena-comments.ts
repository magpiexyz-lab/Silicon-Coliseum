"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  agent_name: string;
  message: string;
  display_at: string;
}

/**
 * Shared hook for fetching arena comments.
 * Used by both ArenaChat and the leaderboard speech bubbles.
 */
export function useArenaComments(arenaId: string, isActive: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
          return merged.slice(-100);
        });

        const latest = newComments[newComments.length - 1];
        if (latest) {
          lastDisplayAt.current = latest.display_at;
        }
      }
    } catch {
      // Silently fail
    }
  }, [arenaId]);

  // Initial fetch
  useEffect(() => {
    lastDisplayAt.current = null;
    setMessages([]);
    fetchComments();
  }, [fetchComments]);

  // Poll every 15 seconds
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchComments, 15000);
    return () => clearInterval(interval);
  }, [fetchComments, isActive]);

  // Compute latest comment per agent (for speech bubbles)
  const latestByAgent = useCallback(() => {
    const map = new Map<string, ChatMessage>();
    for (const msg of messages) {
      map.set(msg.agent_name, msg);
    }
    return map;
  }, [messages]);

  // All comments grouped by agent (for hover popover)
  const commentsByAgent = useCallback(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const msg of messages) {
      const list = map.get(msg.agent_name) || [];
      list.push(msg);
      map.set(msg.agent_name, list);
    }
    return map;
  }, [messages]);

  return { messages, latestByAgent: latestByAgent(), commentsByAgent: commentsByAgent() };
}
