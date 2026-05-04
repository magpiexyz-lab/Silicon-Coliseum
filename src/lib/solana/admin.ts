/**
 * Server-side Solana admin utilities.
 * Used by API routes to sign transactions with the admin keypair.
 *
 * Requires SOLANA_ADMIN_PRIVATE_KEY env var (base58-encoded secret key).
 */
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { SOLANA_RPC_URL } from "./constants";

let _adminKeypair: Keypair | null = null;

/**
 * Get the admin keypair from SOLANA_ADMIN_PRIVATE_KEY env var.
 * Throws if not configured.
 */
export function getAdminKeypair(): Keypair {
  if (!_adminKeypair) {
    const key = process.env.SOLANA_ADMIN_PRIVATE_KEY;
    if (!key) {
      throw new Error(
        "SOLANA_ADMIN_PRIVATE_KEY not set. Cannot sign admin transactions."
      );
    }
    _adminKeypair = Keypair.fromSecretKey(bs58.decode(key));
  }
  return _adminKeypair;
}

/**
 * Get a server-side Solana connection.
 */
export function getServerConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

/**
 * Sign and send a transaction with the admin keypair.
 * Returns the transaction signature.
 */
export async function sendAdminTransaction(
  ...instructions: TransactionInstruction[]
): Promise<string> {
  const connection = getServerConnection();
  const admin = getAdminKeypair();

  const tx = new Transaction();
  for (const ix of instructions) {
    tx.add(ix);
  }

  const sig = await sendAndConfirmTransaction(connection, tx, [admin], {
    commitment: "confirmed",
  });

  return sig;
}

/**
 * Check if the admin keypair is configured.
 */
export function isAdminKeyConfigured(): boolean {
  return !!process.env.SOLANA_ADMIN_PRIVATE_KEY;
}
