import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase-server";
import { CELEBRITY_AGENTS } from "@/lib/celebrity-agents";

/**
 * POST /api/cron/generate-comments
 *
 * Generates a batch of 60 in-character comments from celebrity agents
 * for each active arena. Comments are spaced 30 seconds apart so the
 * conversation unfolds over the next 30 minutes.
 *
 * Called every 30 minutes by Vercel cron.
 */

const cerebras = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY || "",
});

interface CommentLine {
  agent: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret =
      request.headers.get("x-cron-secret") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    const isCronAuth =
      process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!isCronAuth) {
      const { getSession } = await import("@/lib/auth");
      const session = await getSession(request);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const supabaseAuth = createServiceClient();
      const { data: adminUser } = await supabaseAuth
        .from("users")
        .select("is_admin")
        .eq("id", session.userId)
        .maybeSingle();
      if (!adminUser?.is_admin) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    const supabase = createServiceClient();

    // Fetch all active arenas
    const { data: arenas } = await supabase
      .from("arenas")
      .select("id, name")
      .eq("status", "active");

    if (!arenas || arenas.length === 0) {
      return NextResponse.json({
        message: "No active arenas",
        generated: 0,
      });
    }

    let totalGenerated = 0;

    for (const arena of arenas) {
      // Get agents in this arena with their names
      const { data: entries } = await supabase
        .from("arena_entries")
        .select("agent_id, agents(id, name)")
        .eq("arena_id", arena.id)
        .eq("status", "active");

      if (!entries || entries.length < 2) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentMap = new Map<string, { id: string; name: string }>();
      for (const entry of entries) {
        const agent = entry.agents as unknown as { id: string; name: string };
        if (agent) {
          agentMap.set(agent.name, { id: agent.id, name: agent.name });
        }
      }

      const agentNames = Array.from(agentMap.keys());
      if (agentNames.length < 2) continue;

      // Get latest leaderboard standings for context
      const { data: lbEntries } = await supabase
        .from("arena_entries")
        .select("agent_id, cash_balance, agents(name)")
        .eq("arena_id", arena.id)
        .eq("status", "active")
        .order("cash_balance", { ascending: false });

      let standingsContext = "";
      if (lbEntries && lbEntries.length > 0) {
        const standings = lbEntries.map((e, i) => {
          const a = e.agents as unknown as { name: string };
          return `#${i + 1} ${a?.name || "Unknown"} ($${(e.cash_balance || 0).toLocaleString()})`;
        });
        standingsContext = `\n\nCurrent standings:\n${standings.join("\n")}`;
      }

      // Build personality summaries for the prompt
      const personalitySummaries = agentNames
        .map((name) => {
          const celeb = CELEBRITY_AGENTS.find(
            (c) => c.name === name || c.displayName === name
          );
          if (!celeb) return `${name}: A trading agent.`;
          return `${name}: ${celeb.personality.slice(0, 150)}... Catchphrase: "${celeb.catchphrase}"`;
        })
        .join("\n\n");

      // Generate conversation via Cerebras
      const comments = await generateConversation(
        agentNames,
        personalitySummaries,
        arena.name,
        standingsContext
      );

      if (comments.length === 0) continue;

      // Insert comments with staggered display_at times (30 seconds apart)
      const batchId = crypto.randomUUID();
      const now = new Date();

      const rows = comments.map((comment, index) => {
        const agentInfo = agentMap.get(comment.agent);
        const displayAt = new Date(now.getTime() + index * 30 * 1000);

        return {
          arena_id: arena.id,
          agent_id: agentInfo?.id || entries[0].agent_id,
          agent_name: comment.agent,
          message: comment.message,
          display_at: displayAt.toISOString(),
          batch_id: batchId,
        };
      });

      const { error: insertError } = await supabase
        .from("arena_comments")
        .insert(rows);

      if (insertError) {
        console.error(
          `Failed to insert comments for arena ${arena.id}:`,
          insertError
        );
      } else {
        totalGenerated += rows.length;
      }
    }

    return NextResponse.json({
      message: `Generated ${totalGenerated} comments`,
      generated: totalGenerated,
    });
  } catch (error) {
    console.error("Generate comments failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateConversation(
  agentNames: string[],
  personalitySummaries: string,
  arenaName: string,
  standingsContext: string
): Promise<CommentLine[]> {
  try {
    const prompt = `You are a scriptwriter for "Silicon Coliseum", a trading competition where celebrity AI agents trash-talk each other while competing.

Arena: "${arenaName}"
${standingsContext}

The agents in this arena:
${personalitySummaries}

Write a conversation of EXACTLY 60 lines between these agents. The conversation should:
- Be entertaining, funny, and in-character for each celebrity
- Include trash talk about each other's trading strategies and positions
- Reference the current standings (leaders bragging, losers making excuses)
- Include iconic catchphrases and mannerisms from each character
- Have natural back-and-forth exchanges (agents responding to each other)
- Mix topics: market commentary, roasting rivals, bragging about wins, making excuses for losses
- Keep each message SHORT (1-2 sentences max, like a group chat)
- Each agent should appear roughly equally (not the same agent multiple times in a row)
- USE LOTS OF EMOJIS in every message! Each message should have 1-3 relevant emojis (fire, rocket, skull, crown, clown, money, chart, muscle, cry-laugh, etc.)
- Add cute/funny expressions like "no cap", "fr fr", "lowkey", "ngl", "its giving", "cope harder", "slay", "gg", "rekt", "skill issue" mixed with each character's style
- Make it feel like a chaotic group chat with reactions, roasts, and hype

Format each line EXACTLY as:
AGENT_NAME: message text here

Only use these exact agent names: ${agentNames.join(", ")}

Start the conversation now. 60 lines total.`;

    const response = await cerebras.chat.completions.create({
      model: "llama-4-scout-17b-16e-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.9,
    });

    const content = response.choices[0]?.message?.content || "";
    return parseConversation(content, agentNames);
  } catch (error) {
    console.error("Cerebras conversation generation failed:", error);
    // Fallback: try with a smaller model
    try {
      const response = await cerebras.chat.completions.create({
        model: "llama3.1-8b",
        messages: [
          {
            role: "user",
            content: `Write 60 lines of funny trash-talk between trading AI agents named: ${agentNames.join(", ")}. Each line should be "AGENT_NAME: short message". Keep it entertaining, in-character, and reference a trading competition called "${arenaName}". USE LOTS OF EMOJIS in every message! Make it feel like a chaotic group chat with roasts and hype.${standingsContext}`,
          },
        ],
        max_tokens: 4000,
        temperature: 0.9,
      });

      const content = response.choices[0]?.message?.content || "";
      return parseConversation(content, agentNames);
    } catch (fallbackError) {
      console.error("Fallback generation also failed:", fallbackError);
      return [];
    }
  }
}

function parseConversation(
  content: string,
  validAgents: string[]
): CommentLine[] {
  const lines = content.split("\n").filter((line) => line.trim());
  const comments: CommentLine[] = [];

  // Build a lookup for agent names (case-insensitive)
  const agentLookup = new Map<string, string>();
  for (const name of validAgents) {
    agentLookup.set(name.toLowerCase(), name);
    // Also handle "The Rock" vs "Rock" etc.
    const words = name.split(" ");
    if (words.length > 1) {
      agentLookup.set(words[words.length - 1].toLowerCase(), name);
    }
  }

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1 || colonIndex > 50) continue;

    const rawName = line.substring(0, colonIndex).trim();
    const message = line.substring(colonIndex + 1).trim();

    if (!message) continue;

    // Try to match agent name
    let agentName = agentLookup.get(rawName.toLowerCase());
    if (!agentName) {
      // Try partial match
      for (const [key, value] of agentLookup.entries()) {
        if (rawName.toLowerCase().includes(key) || key.includes(rawName.toLowerCase())) {
          agentName = value;
          break;
        }
      }
    }

    if (agentName) {
      comments.push({ agent: agentName, message });
    }
  }

  // Ensure we have at most 60 comments
  return comments.slice(0, 60);
}
