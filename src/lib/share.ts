import { randomBytes } from "crypto";
import { createServiceClient } from "./supabase-server";

export async function generateShareToken(agentId: string): Promise<string> {
  const supabase = createServiceClient();
  const token = randomBytes(32).toString("hex");

  const { error } = await supabase.from("share_tokens").insert({
    agent_id: agentId,
    token,
  });

  if (error) {
    console.error("Failed to create share token:", error);
    throw new Error("Failed to create share token");
  }

  return token;
}

export async function validateShareToken(
  token: string
): Promise<{ agentId: string } | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("share_tokens")
    .select("agent_id")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { agentId: data.agent_id };
}
