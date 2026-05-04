import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { CELEBRITY_AGENTS } from "@/lib/celebrity-agents";

/**
 * POST /api/admin/cleanup
 * Cleans up the database:
 * - Removes ALL non-system users and their data
 * - Removes ALL arenas (old and current)
 * - Removes duplicate celebrity agents, re-creates correct set of 30
 * - Removes BLOT and MAGIC tokens
 * Protected by CRON_SECRET or admin auth.
 */
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
      const supabase = createServiceClient();
      const { data: adminUser } = await supabase
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
    const log: string[] = [];

    // 1. Get system user
    const { data: systemUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", "system@silicon-coliseum.ai")
      .maybeSingle();

    const systemUserId = systemUser?.id;

    // 2. Delete all bets
    await supabase
      .from("bets")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all bets");

    // 3. Delete all sol_transactions
    await supabase
      .from("sol_transactions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all sol_transactions");

    // 4. Delete all sol_rewards
    await supabase
      .from("sol_rewards")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all sol_rewards");

    // 5. Delete all cp_transactions
    await supabase
      .from("cp_transactions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all cp_transactions");

    // 6. Delete all arena_trades
    await supabase
      .from("arena_trades")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all arena_trades");

    // 7. Delete all arena_balances
    await supabase
      .from("arena_balances")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all arena_balances");

    // 8. Delete all arena_entries
    await supabase
      .from("arena_entries")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all arena_entries");

    // 9. Delete all arena_results
    await supabase
      .from("arena_results")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all arena_results");

    // 10. Delete all pool_snapshots
    await supabase
      .from("pool_snapshots")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all pool_snapshots");

    // 11. Delete all pools
    await supabase
      .from("pools")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all pools");

    // 12. Delete all arena_tokens
    await supabase
      .from("arena_tokens")
      .delete()
      .neq("arena_id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all arena_tokens");

    // 13. Delete all arenas
    await supabase
      .from("arenas")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all arenas");

    // 14. Delete ALL agents (including system ones — we'll re-create them)
    await supabase
      .from("agents")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    log.push("Deleted all agents");

    // 15. Delete all non-system users
    if (systemUserId) {
      // Delete user_profiles for non-system users
      await supabase
        .from("user_profiles")
        .delete()
        .neq("user_id", systemUserId);

      // Delete non-system users
      const { data: nonSystemUsers } = await supabase
        .from("users")
        .select("id, auth_id")
        .neq("id", systemUserId);

      if (nonSystemUsers && nonSystemUsers.length > 0) {
        // Delete from users table
        await supabase
          .from("users")
          .delete()
          .neq("id", systemUserId);

        // Delete from Supabase Auth
        for (const u of nonSystemUsers) {
          if (u.auth_id && u.auth_id !== "00000000-0000-0000-0000-000000000001") {
            try {
              await supabase.auth.admin.deleteUser(u.auth_id);
            } catch {
              // ignore auth deletion failures
            }
          }
        }
        log.push(`Deleted ${nonSystemUsers.length} non-system users`);
      }
    }

    // 16. Delete BLOT and MAGIC tokens
    await supabase
      .from("platform_tokens")
      .delete()
      .in("symbol", ["BLOT", "MAGIC"]);
    log.push("Deleted deprecated tokens (BLOT, MAGIC)");

    // 17. Re-create all 30 celebrity agents
    if (systemUserId) {
      for (const celeb of CELEBRITY_AGENTS) {
        const { error: agentError } = await supabase
          .from("agents")
          .insert({
            user_id: systemUserId,
            name: celeb.name,
            risk_level: celeb.riskLevel,
            strategy_description: celeb.strategyDescription,
            total_arenas: 0,
            total_wins: 0,
            best_pnl: 0,
          });

        if (agentError) {
          log.push(`FAILED to create agent "${celeb.name}": ${agentError.message}`);
        } else {
          log.push(`Created agent: "${celeb.name}" (${celeb.riskLevel})`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database cleaned up successfully!",
      log,
      summary: {
        agentsCreated: CELEBRITY_AGENTS.length,
      },
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return NextResponse.json(
      { error: `Cleanup failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
