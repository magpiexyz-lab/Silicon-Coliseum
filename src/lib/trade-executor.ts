import type { Agent, AITradeAction, MarketData, Trade } from "./types";
import { createServiceClient } from "./supabase-server";

const DUST_THRESHOLD_USD = 0.01;

export async function executeTrades(
  agent: Agent,
  actions: AITradeAction[],
  prices: Map<string, MarketData>
): Promise<Trade[]> {
  const supabase = createServiceClient();
  const executedTrades: Trade[] = [];

  // Track balance changes locally to avoid stale reads
  let currentBalance = agent.current_balance;

  for (const action of actions) {
    const marketData = prices.get(action.token);
    if (!marketData || marketData.price <= 0) {
      console.warn(
        `Skipping trade for ${action.token}: no price data available`
      );
      continue;
    }

    const currentPrice = marketData.price;

    if (action.action === "BUY") {
      // Verify agent has enough cash
      if (action.amount_usd > currentBalance) {
        console.warn(
          `Skipping BUY ${action.token}: insufficient cash ($${currentBalance.toFixed(2)} < $${action.amount_usd.toFixed(2)})`
        );
        continue;
      }

      const tokenAmount = action.amount_usd / currentPrice;

      // Fetch current holding for this token
      const { data: existingHolding } = await supabase
        .from("holdings")
        .select("*")
        .eq("agent_id", agent.id)
        .eq("token", action.token)
        .maybeSingle();

      if (existingHolding) {
        // Update with VWAP
        const oldAmount = existingHolding.amount;
        const oldAvg = existingHolding.avg_buy_price;
        const newAmount = oldAmount + tokenAmount;
        const newAvg =
          (oldAmount * oldAvg + tokenAmount * currentPrice) / newAmount;

        const { error: updateError } = await supabase
          .from("holdings")
          .update({
            amount: newAmount,
            avg_buy_price: newAvg,
          })
          .eq("id", existingHolding.id);

        if (updateError) {
          console.error(`Failed to update holding for ${action.token}:`, updateError);
          continue;
        }
      } else {
        // Create new holding
        const { error: insertError } = await supabase
          .from("holdings")
          .insert({
            agent_id: agent.id,
            token: action.token,
            amount: tokenAmount,
            avg_buy_price: currentPrice,
          });

        if (insertError) {
          console.error(`Failed to create holding for ${action.token}:`, insertError);
          continue;
        }
      }

      // Deduct from balance
      currentBalance -= action.amount_usd;
      const { error: balanceError } = await supabase
        .from("agents")
        .update({ current_balance: currentBalance })
        .eq("id", agent.id);

      if (balanceError) {
        console.error("Failed to update agent balance:", balanceError);
      }

      // Record the trade
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert({
          agent_id: agent.id,
          action: "BUY",
          token: action.token,
          amount_usd: action.amount_usd,
          price: currentPrice,
          token_amount: tokenAmount,
          confidence: action.confidence,
          reasoning: action.reason,
        })
        .select()
        .single();

      if (tradeError) {
        console.error("Failed to record BUY trade:", tradeError);
        continue;
      }

      executedTrades.push(trade as Trade);
    } else if (action.action === "SELL") {
      // Fetch current holding
      const { data: holding } = await supabase
        .from("holdings")
        .select("*")
        .eq("agent_id", agent.id)
        .eq("token", action.token)
        .maybeSingle();

      if (!holding || holding.amount <= 0) {
        console.warn(
          `Skipping SELL ${action.token}: no holding found`
        );
        continue;
      }

      // Calculate how many tokens to sell
      let tokenAmountToSell = action.amount_usd / currentPrice;

      // Check if agent holds enough
      if (tokenAmountToSell > holding.amount) {
        tokenAmountToSell = holding.amount;
      }

      // Check if selling would leave dust
      const remainingTokens = holding.amount - tokenAmountToSell;
      const remainingValue = remainingTokens * currentPrice;

      if (remainingValue < DUST_THRESHOLD_USD) {
        // Sell entire position
        tokenAmountToSell = holding.amount;
      }

      const proceedsUsd = tokenAmountToSell * currentPrice;
      const newAmount = holding.amount - tokenAmountToSell;

      if (newAmount <= 0) {
        // Remove the holding entirely
        const { error: deleteError } = await supabase
          .from("holdings")
          .delete()
          .eq("id", holding.id);

        if (deleteError) {
          console.error(`Failed to delete holding for ${action.token}:`, deleteError);
          continue;
        }
      } else {
        // Update holding with reduced amount
        const { error: updateError } = await supabase
          .from("holdings")
          .update({ amount: newAmount })
          .eq("id", holding.id);

        if (updateError) {
          console.error(`Failed to update holding for ${action.token}:`, updateError);
          continue;
        }
      }

      // Add proceeds to balance
      currentBalance += proceedsUsd;
      const { error: balanceError } = await supabase
        .from("agents")
        .update({ current_balance: currentBalance })
        .eq("id", agent.id);

      if (balanceError) {
        console.error("Failed to update agent balance:", balanceError);
      }

      // Record the trade
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert({
          agent_id: agent.id,
          action: "SELL",
          token: action.token,
          amount_usd: proceedsUsd,
          price: currentPrice,
          token_amount: tokenAmountToSell,
          confidence: action.confidence,
          reasoning: action.reason,
        })
        .select()
        .single();

      if (tradeError) {
        console.error("Failed to record SELL trade:", tradeError);
        continue;
      }

      executedTrades.push(trade as Trade);
    }
  }

  return executedTrades;
}
