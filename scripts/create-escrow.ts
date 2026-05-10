/**
 * Create the on-chain ArenaEscrow PDA for an existing arena.
 * Run with: npx tsx scripts/create-escrow.ts <arena-uuid>
 * If no UUID provided, creates escrows for ALL arenas missing them.
 */
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PROGRAM_ID = new PublicKey("5MSzqvJ6Kavmqsn3qnCvpEtyFn8NPSJNvrJZ4RXRoVeU");
const SEED_CONFIG = "config";
const SEED_ARENA = "arena";
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(SEED_CONFIG)], PROGRAM_ID);
}

function getArenaEscrowPDA(arenaUuid: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ARENA), uuidToBytes(arenaUuid)],
    PROGRAM_ID
  );
}

async function getDiscriminator(name: string): Promise<Uint8Array> {
  const msgBuffer = new TextEncoder().encode(`global:${name}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return new Uint8Array(hashBuffer).slice(0, 8);
}

async function createEscrow(connection: Connection, admin: Keypair, arenaUuid: string) {
  const [configPDA] = getConfigPDA();
  const [escrowPDA] = getArenaEscrowPDA(arenaUuid);

  // Check if already exists
  const existing = await connection.getAccountInfo(escrowPDA);
  if (existing) {
    console.log(`  Escrow already exists: ${escrowPDA.toBase58()} — skipping`);
    return;
  }

  // Build create_arena_escrow instruction
  const disc = await getDiscriminator("create_arena_escrow");
  const arenaUuidBytes = uuidToBytes(arenaUuid);
  const data = new Uint8Array(8 + 16);
  data.set(disc, 0);
  data.set(arenaUuidBytes, 8);

  const instruction = {
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(data),
  };

  const tx = new Transaction().add(instruction);

  console.log(`  Creating escrow PDA: ${escrowPDA.toBase58()}`);
  console.log(`  Admin: ${admin.publicKey.toBase58()}`);

  const sig = await sendAndConfirmTransaction(connection, tx, [admin], {
    commitment: "confirmed",
  });

  console.log(`  SUCCESS! Tx: ${sig}`);

  // Verify
  const created = await connection.getAccountInfo(escrowPDA);
  if (created) {
    console.log(`  Verified: escrow exists, size=${created.data.length} bytes`);
  }
}

async function main() {
  const adminKey = process.env.SOLANA_ADMIN_PRIVATE_KEY;
  if (!adminKey) {
    console.error("ERROR: SOLANA_ADMIN_PRIVATE_KEY not set in .env.local");
    process.exit(1);
  }

  const admin = Keypair.fromSecretKey(bs58.decode(adminKey));
  const connection = new Connection(RPC_URL, "confirmed");

  console.log("=== Create Arena Escrow ===");
  console.log("Network:", RPC_URL);
  console.log("Admin:", admin.publicKey.toBase58());

  // Check admin balance
  const balance = await connection.getBalance(admin.publicKey);
  console.log("Admin balance:", balance / 1e9, "SOL");

  if (balance < 0.01 * 1e9) {
    console.error("ERROR: Admin wallet needs SOL for rent. Airdrop some devnet SOL first.");
    console.log("Run: solana airdrop 2 " + admin.publicKey.toBase58() + " --url devnet");
    process.exit(1);
  }

  const targetUuid = process.argv[2];

  if (targetUuid) {
    // Create escrow for specific arena
    console.log(`\nCreating escrow for arena: ${targetUuid}`);
    await createEscrow(connection, admin, targetUuid);
  } else {
    // Fetch all arenas from Supabase and create escrows for any missing ones
    console.log("\nFetching arenas from Supabase...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/arenas?select=id,name,status,bet_type&order=created_at.desc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const arenas = await res.json();

    if (!arenas || arenas.length === 0) {
      console.log("No arenas found.");
      return;
    }

    // Filter to arenas that support SOL betting
    const solArenas = arenas.filter(
      (a: { bet_type: string }) => a.bet_type === "sol_only" || a.bet_type === "both"
    );
    console.log(`Found ${solArenas.length} arenas with SOL betting (out of ${arenas.length} total)`);

    for (const arena of solArenas) {
      console.log(`\n[${arena.status}] ${arena.name} (${arena.id})`);
      await createEscrow(connection, admin, arena.id);
    }
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
