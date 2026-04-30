import { PublicKey, clusterApiUrl } from "@solana/web3.js";

// Lazy-initialized PublicKeys to avoid crashes during Next.js static page collection.
// env vars may not be available at module evaluation time on Vercel.

let _programId: PublicKey | null = null;
export function getProgramId(): PublicKey {
  if (!_programId) {
    _programId = new PublicKey(
      process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID ||
        "5MSzqvJ6Kavmqsn3qnCvpEtyFn8NPSJNvrJZ4RXRoVeU"
    );
  }
  return _programId;
}
// Alias for backward compat — used as a value, calls getProgramId() internally
export const PROGRAM_ID = new Proxy({} as PublicKey, {
  get(_, prop) {
    const real = getProgramId();
    const val = (real as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(real) : val;
  },
});

let _treasuryPubkey: PublicKey | null = null;
export function getTreasuryPubkey(): PublicKey {
  if (!_treasuryPubkey) {
    _treasuryPubkey = new PublicKey(
      process.env.NEXT_PUBLIC_TREASURY_WALLET ||
        "GxNjXgAyfqTS5RmFBVPgbDz7eEd5pFJrNYGxZJQMeJYf"
    );
  }
  return _treasuryPubkey;
}
export const TREASURY_PUBKEY = new Proxy({} as PublicKey, {
  get(_, prop) {
    const real = getTreasuryPubkey();
    const val = (real as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(real) : val;
  },
});

// Solana cluster
export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
  "devnet") as "devnet" | "testnet" | "mainnet-beta";

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

// CP conversion rate: 1 SOL = 10,000 CP
// In lamports: 1_000_000_000 / 10_000 = 100_000 lamports per CP
export const CP_RATE_LAMPORTS = BigInt(100_000);
export const CP_PER_SOL = 10_000;

// Agent creation cost in CP
export const AGENT_CREATION_COST_CP = 10_000;

// Minimum SOL bet: 0.01 SOL
export const MIN_BET_SOL = 0.01;
export const MIN_BET_LAMPORTS = BigInt(10_000_000);

// Fee: 5% (500 basis points)
export const FEE_BPS = 500;

// Lamports per SOL
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

// PDA Seeds
export const SEED_CONFIG = "config";
export const SEED_ARENA = "arena";
export const SEED_BET = "bet";
export const SEED_REWARD = "reward";
