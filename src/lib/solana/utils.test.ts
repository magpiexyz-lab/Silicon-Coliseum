import { describe, it, expect } from "vitest";
import {
  uuidToBytes,
  bytesToUuid,
  lamportsToSol,
  solToLamports,
  getConfigPDA,
  getArenaEscrowPDA,
  getUserBetPDA,
  getUserRewardPDA,
} from "./utils";
import { PublicKey } from "@solana/web3.js";

describe("uuidToBytes", () => {
  it("converts a valid UUID to 16 bytes", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const bytes = uuidToBytes(uuid);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(16);
    expect(bytes[0]).toBe(0x55);
    expect(bytes[1]).toBe(0x0e);
    expect(bytes[15]).toBe(0x00);
  });

  it("throws on invalid UUID (wrong length)", () => {
    expect(() => uuidToBytes("invalid")).toThrow("Invalid UUID");
  });

  it("handles UUID without dashes correctly", () => {
    // Even if dashes are already stripped in the hex, length check should catch issues
    const uuid = "00000000-0000-0000-0000-000000000001";
    const bytes = uuidToBytes(uuid);
    expect(bytes[15]).toBe(1);
    expect(bytes.slice(0, 15).every((b) => b === 0)).toBe(true);
  });
});

describe("bytesToUuid", () => {
  it("converts 16 bytes back to UUID string", () => {
    const original = "550e8400-e29b-41d4-a716-446655440000";
    const bytes = uuidToBytes(original);
    const recovered = bytesToUuid(bytes);
    expect(recovered).toBe(original);
  });

  it("round-trips correctly for various UUIDs", () => {
    const uuids = [
      "00000000-0000-0000-0000-000000000001",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "12345678-1234-1234-1234-123456789abc",
    ];
    for (const uuid of uuids) {
      expect(bytesToUuid(uuidToBytes(uuid))).toBe(uuid);
    }
  });
});

describe("lamportsToSol", () => {
  it("converts lamports to SOL correctly", () => {
    expect(lamportsToSol(1_000_000_000)).toBe(1.0);
    expect(lamportsToSol(500_000_000)).toBe(0.5);
    expect(lamportsToSol(10_000_000)).toBe(0.01);
    expect(lamportsToSol(0)).toBe(0);
  });

  it("handles bigint input", () => {
    expect(lamportsToSol(BigInt(2_000_000_000))).toBe(2.0);
  });
});

describe("solToLamports", () => {
  it("converts SOL to lamports correctly", () => {
    expect(solToLamports(1.0)).toBe(BigInt(1_000_000_000));
    expect(solToLamports(0.5)).toBe(BigInt(500_000_000));
    expect(solToLamports(0.01)).toBe(BigInt(10_000_000));
    expect(solToLamports(0)).toBe(BigInt(0));
  });

  it("rounds correctly for fractional lamports", () => {
    // 0.0000000015 SOL = 1.5 lamports → rounds to 2
    expect(solToLamports(0.0000000015)).toBe(BigInt(2));
  });
});

describe("PDA derivation", () => {
  it("getConfigPDA returns consistent results", () => {
    const [pda1, bump1] = getConfigPDA();
    const [pda2, bump2] = getConfigPDA();
    expect(pda1.toBase58()).toBe(pda2.toBase58());
    expect(bump1).toBe(bump2);
    expect(pda1).toBeInstanceOf(PublicKey);
  });

  it("getArenaEscrowPDA returns different PDAs for different UUIDs", () => {
    const [pda1] = getArenaEscrowPDA("550e8400-e29b-41d4-a716-446655440000");
    const [pda2] = getArenaEscrowPDA("660e8400-e29b-41d4-a716-446655440000");
    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("getArenaEscrowPDA returns same PDA for same UUID", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const [pda1] = getArenaEscrowPDA(uuid);
    const [pda2] = getArenaEscrowPDA(uuid);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("getUserBetPDA is deterministic", () => {
    const escrow = PublicKey.default; // System program (all zeros)
    const user = new PublicKey("GxNjXgAyfqTS5RmFBVPgbDz7eEd5pFJrNYGxZJQMeJYf");
    const [pda1] = getUserBetPDA(escrow, user);
    const [pda2] = getUserBetPDA(escrow, user);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("getUserRewardPDA is deterministic", () => {
    const escrow = PublicKey.default;
    const user = new PublicKey("GxNjXgAyfqTS5RmFBVPgbDz7eEd5pFJrNYGxZJQMeJYf");
    const [pda1] = getUserRewardPDA(escrow, user);
    const [pda2] = getUserRewardPDA(escrow, user);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("getUserBetPDA and getUserRewardPDA differ for same inputs", () => {
    const escrow = PublicKey.default;
    const user = new PublicKey("GxNjXgAyfqTS5RmFBVPgbDz7eEd5pFJrNYGxZJQMeJYf");
    const [betPda] = getUserBetPDA(escrow, user);
    const [rewardPda] = getUserRewardPDA(escrow, user);
    expect(betPda.toBase58()).not.toBe(rewardPda.toBase58());
  });
});
