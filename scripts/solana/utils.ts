/**
 * Shared utilities for Solana admin scripts.
 * Usage: npx tsx scripts/solana/<script>.ts
 *
 * Requires: SOLANA_ADMIN_PRIVATE_KEY env var (base58-encoded keypair)
 */
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import bs58 from "bs58";

export function getConnection(): Connection {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
  return new Connection(rpcUrl, "confirmed");
}

export function getAdminKeypair(): Keypair {
  const key = process.env.SOLANA_ADMIN_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "SOLANA_ADMIN_PRIVATE_KEY not set. Export it as base58-encoded secret key."
    );
  }
  return Keypair.fromSecretKey(bs58.decode(key));
}

export async function sendTx(
  connection: Connection,
  signer: Keypair,
  ...instructions: TransactionInstruction[]
): Promise<string> {
  const tx = new Transaction();
  for (const ix of instructions) {
    tx.add(ix);
  }
  const sig = await sendAndConfirmTransaction(connection, tx, [signer], {
    commitment: "confirmed",
  });
  return sig;
}

/**
 * Convert UUID string to 16-byte Uint8Array.
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

export function lamportsToSol(lamports: number | bigint): string {
  return (Number(lamports) / 1_000_000_000).toFixed(4);
}
