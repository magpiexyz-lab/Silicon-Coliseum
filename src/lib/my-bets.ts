/**
 * My Bets — transform raw bet rows from Supabase into a clean API response.
 */

export interface MyBet {
  id: string;
  agentId: string;
  agentName: string;
  cpAmount: number;
  solAmount: number;
  betCurrency: string;
  status: string;
  createdAt: string;
}

export interface RawBetRow {
  id: string;
  agent_id: string;
  agents: { name: string } | null;
  cp_amount: number | null;
  sol_amount: number | null;
  bet_currency: string;
  status: string;
  created_at: string;
}

/**
 * Transform raw Supabase bet rows (with agent join) into clean MyBet objects.
 */
export function transformBetsResponse(rawBets: RawBetRow[]): MyBet[] {
  return rawBets.map((bet) => ({
    id: bet.id,
    agentId: bet.agent_id,
    agentName: bet.agents?.name ?? "Unknown Agent",
    cpAmount: bet.cp_amount ?? 0,
    solAmount: bet.sol_amount ?? 0,
    betCurrency: bet.bet_currency,
    status: bet.status,
    createdAt: bet.created_at,
  }));
}
