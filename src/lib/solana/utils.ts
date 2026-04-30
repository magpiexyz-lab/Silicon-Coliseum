import { PublicKey } from "@solana/web3.js";
import {
  getProgramId,
  SEED_CONFIG,
  SEED_ARENA,
  SEED_BET,
  SEED_REWARD,
} from "./constants";

/**
 * Convert a UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * to a 16-byte Uint8Array for use as PDA seed.
 */
export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert 16-byte array back to UUID string.
 */
export function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Derive the ProgramConfig PDA.
 */
export function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CONFIG)],
    getProgramId()
  );
}

/**
 * Derive the ArenaEscrow PDA for a given arena UUID.
 */
export function getArenaEscrowPDA(arenaUuid: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ARENA), uuidToBytes(arenaUuid)],
    getProgramId()
  );
}

/**
 * Derive the UserBet PDA for a user in an arena.
 */
export function getUserBetPDA(
  arenaEscrowPubkey: PublicKey,
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED_BET),
      arenaEscrowPubkey.toBuffer(),
      userPubkey.toBuffer(),
    ],
    getProgramId()
  );
}

/**
 * Derive the UserReward PDA for a user in an arena.
 */
export function getUserRewardPDA(
  arenaEscrowPubkey: PublicKey,
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED_REWARD),
      arenaEscrowPubkey.toBuffer(),
      userPubkey.toBuffer(),
    ],
    getProgramId()
  );
}

/**
 * Format lamports as SOL string (e.g., 1500000000 → "1.5 SOL").
 */
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1_000_000_000;
}

/**
 * Convert SOL to lamports.
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * 1_000_000_000));
}
