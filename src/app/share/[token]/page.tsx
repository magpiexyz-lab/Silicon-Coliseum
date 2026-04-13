import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase-server";
import SharePageClient from "./share-page-client";
import type { Agent, Holding, Trade, User } from "@/lib/types";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Validate share token
  const { data: shareToken } = await supabase
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (!shareToken) notFound();

  // Fetch agent
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", shareToken.agent_id)
    .single();

  if (!agent) notFound();

  // Fetch owner
  const { data: user } = await supabase
    .from("users")
    .select("username")
    .eq("id", agent.user_id)
    .single();

  // Fetch holdings
  const { data: holdings } = await supabase
    .from("holdings")
    .select("*")
    .eq("agent_id", agent.id);

  // Fetch recent trades
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <SharePageClient
      agent={agent as Agent}
      ownerUsername={user?.username || "Unknown"}
      holdings={(holdings || []) as Holding[]}
      trades={(trades || []) as Trade[]}
    />
  );
}
