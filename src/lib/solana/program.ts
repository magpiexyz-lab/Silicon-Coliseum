import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  getProgramId,
  getTreasuryPubkey,
  SOLANA_RPC_URL,
} from "./constants";
import {
  getConfigPDA,
  getArenaEscrowPDA,
  getUserBetPDA,
  getUserRewardPDA,
  uuidToBytes,
} from "./utils";

// ============================================================================
// Connection
// ============================================================================

let _connection: Connection | null = null;
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return _connection;
}

// ============================================================================
// Anchor Discriminator Computation
// ============================================================================

const discriminatorCache = new Map<string, Uint8Array>();

async function getDiscriminator(instructionName: string): Promise<Uint8Array> {
  const cached = discriminatorCache.get(instructionName);
  if (cached) return cached;

  const msgBuffer = new TextEncoder().encode(`global:${instructionName}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const disc = new Uint8Array(hashBuffer).slice(0, 8);
  discriminatorCache.set(instructionName, disc);
  return disc;
}

// ============================================================================
// Serialization Helpers
// ============================================================================

function writeU64LE(buf: Uint8Array, value: bigint, offset: number): void {
  const view = new DataView(buf.buffer, buf.byteOffset);
  view.setBigUint64(offset, value, true);
}

function writeU16LE(buf: Uint8Array, value: number, offset: number): void {
  const view = new DataView(buf.buffer, buf.byteOffset);
  view.setUint16(offset, value, true);
}

// ============================================================================
// Instruction Builders
// ============================================================================

/**
 * Buy CP by sending SOL to the treasury.
 * After tx confirms, call POST /api/solana/buy-cp with the tx signature.
 */
export async function createBuyCpInstruction(
  userPubkey: PublicKey,
  solAmountLamports: bigint
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("buy_cp");
  const [configPDA] = getConfigPDA();

  const data = new Uint8Array(8 + 8); // disc + u64
  data.set(disc, 0);
  writeU64LE(data, solAmountLamports, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: getTreasuryPubkey(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(data),
  });
}

/**
 * Place a SOL bet on an arena.
 * After tx confirms, call POST /api/solana/verify-bet with the tx signature.
 */
export async function createPlaceBetInstruction(
  userPubkey: PublicKey,
  arenaUuid: string,
  solAmountLamports: bigint
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("place_bet");
  const [configPDA] = getConfigPDA();
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);
  const [userBetPDA] = getUserBetPDA(arenaEscrowPDA, userPubkey);

  const data = new Uint8Array(8 + 8); // disc + u64
  data.set(disc, 0);
  writeU64LE(data, solAmountLamports, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: userBetPDA, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(data),
  });
}

/**
 * Add more SOL to an existing bet on an arena.
 * Use this when user_bet PDA already exists.
 */
export async function createAddBetInstruction(
  userPubkey: PublicKey,
  arenaUuid: string,
  solAmountLamports: bigint
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("add_bet");
  const [configPDA] = getConfigPDA();
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);
  const [userBetPDA] = getUserBetPDA(arenaEscrowPDA, userPubkey);

  const data = new Uint8Array(8 + 8); // disc + u64
  data.set(disc, 0);
  writeU64LE(data, solAmountLamports, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: userBetPDA, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(data),
  });
}

/**
 * Cancel a SOL bet (only during betting phase).
 */
export async function createCancelBetInstruction(
  userPubkey: PublicKey,
  arenaUuid: string
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("cancel_bet");
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);
  const [userBetPDA] = getUserBetPDA(arenaEscrowPDA, userPubkey);

  return new TransactionInstruction({
    keys: [
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: userBetPDA, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(disc),
  });
}

/**
 * Claim a SOL reward from a finalized arena.
 */
export async function createClaimRewardInstruction(
  userPubkey: PublicKey,
  arenaUuid: string
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("claim_reward");
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);
  const [userRewardPDA] = getUserRewardPDA(arenaEscrowPDA, userPubkey);

  return new TransactionInstruction({
    keys: [
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: userRewardPDA, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(disc),
  });
}

// ============================================================================
// Transaction Builders (combine instruction + send via wallet)
// ============================================================================

/**
 * Build a transaction with a single instruction.
 * The wallet adapter will sign and send this.
 */
export async function buildTransaction(
  instruction: TransactionInstruction,
  feePayer: PublicKey
): Promise<Transaction> {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer,
  });
  tx.add(instruction);

  return tx;
}

// ============================================================================
// Admin Instruction Builders (for server-side scripts)
// ============================================================================

/**
 * Initialize the program. Admin-only, called once after deployment.
 */
export async function createInitializeInstruction(
  adminPubkey: PublicKey,
  treasuryPubkey: PublicKey,
  cpRateLamports: bigint,
  minBetLamports: bigint,
  feeBps: number
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("initialize");
  const [configPDA] = getConfigPDA();

  const data = new Uint8Array(8 + 8 + 8 + 2); // disc + u64 + u64 + u16
  data.set(disc, 0);
  writeU64LE(data, cpRateLamports, 8);
  writeU64LE(data, minBetLamports, 16);
  writeU16LE(data, feeBps, 24);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: adminPubkey, isSigner: true, isWritable: true },
      { pubkey: treasuryPubkey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(data),
  });
}

/**
 * Create an arena escrow PDA. Admin-only.
 */
export async function createArenaEscrowInstruction(
  adminPubkey: PublicKey,
  arenaUuid: string
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("create_arena_escrow");
  const [configPDA] = getConfigPDA();
  const arenaUuidBytes = uuidToBytes(arenaUuid);
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);

  const data = new Uint8Array(8 + 16); // disc + [u8; 16]
  data.set(disc, 0);
  data.set(arenaUuidBytes, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: adminPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(data),
  });
}

/**
 * Close betting for an arena. Admin-only.
 */
export async function createCloseBettingInstruction(
  adminPubkey: PublicKey,
  arenaUuid: string
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("close_betting");
  const [configPDA] = getConfigPDA();
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: adminPubkey, isSigner: true, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(disc),
  });
}

/**
 * Set a reward for a winner. Admin-only, called per winner.
 */
export async function createSetRewardInstruction(
  adminPubkey: PublicKey,
  arenaUuid: string,
  winnerPubkey: PublicKey,
  amountLamports: bigint
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("set_reward");
  const [configPDA] = getConfigPDA();
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);
  const [userRewardPDA] = getUserRewardPDA(arenaEscrowPDA, winnerPubkey);

  const data = new Uint8Array(8 + 8); // disc + u64
  data.set(disc, 0);
  writeU64LE(data, amountLamports, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: userRewardPDA, isSigner: false, isWritable: true },
      { pubkey: winnerPubkey, isSigner: false, isWritable: false },
      { pubkey: adminPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(data),
  });
}

/**
 * Finalize an arena and send fee to treasury. Admin-only.
 */
export async function createFinalizeArenaInstruction(
  adminPubkey: PublicKey,
  arenaUuid: string,
  feeAmountLamports: bigint
): Promise<TransactionInstruction> {
  const disc = await getDiscriminator("finalize_arena");
  const [configPDA] = getConfigPDA();
  const [arenaEscrowPDA] = getArenaEscrowPDA(arenaUuid);

  const data = new Uint8Array(8 + 8); // disc + u64
  data.set(disc, 0);
  writeU64LE(data, feeAmountLamports, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: arenaEscrowPDA, isSigner: false, isWritable: true },
      { pubkey: getTreasuryPubkey(), isSigner: false, isWritable: true },
      { pubkey: adminPubkey, isSigner: true, isWritable: false },
    ],
    programId: getProgramId(),
    data: Buffer.from(data),
  });
}
