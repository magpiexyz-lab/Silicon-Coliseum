import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import DashboardClient from "./_components/dashboard-client";
import type { Agent, Trade, Decision, User } from "@/lib/types";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySession(token);
  if (!session) redirect("/login");

  const supabase = createServiceClient();

  // Fetch user
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (!user) redirect("/login");

  // Fetch user's agents
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  // Fetch recent trades (from arena_trades)
  const agentIds = (agents || []).map((a: Agent) => a.id);
  let trades: Trade[] = [];
  if (agentIds.length > 0) {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: false })
      .limit(50);
    trades = data || [];
  }

  // Fetch recent decisions
  let decisions: Decision[] = [];
  if (agentIds.length > 0) {
    const { data } = await supabase
      .from("decisions")
      .select("*")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: false })
      .limit(30);
    decisions = data || [];
  }

  return (
    <DashboardClient
      user={user as User}
      agents={(agents || []) as Agent[]}
      trades={trades}
      decisions={decisions}
      walletAddress={session.walletAddress}
    />
  );
}
