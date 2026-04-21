import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
}));

// Mock admin
vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

// Mock supabase-server
vi.mock("@/lib/supabase-server", () => ({
  createServiceClient: vi.fn(),
}));

// Mock pool-manager
vi.mock("@/lib/pool-manager", () => ({
  createPool: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-server";
import { createPool } from "@/lib/pool-manager";

const UUID_A1 = "a0000000-0000-4000-a000-000000000001";
const UUID_T1 = "b0000000-0000-4000-a000-000000000010";
const UUID_T2 = "c0000000-0000-4000-a000-000000000020";

let GET: (request: Request) => Promise<Response>;
let POST: (request: Request) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("./route");
  GET = mod.GET;
  POST = mod.POST;
});

function mockSupabaseQuery(data: unknown, error: unknown = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe("GET /api/admin/pools", () => {
  it("returns pools list", async () => {
    const pools = [
      { id: "p1", arena_id: UUID_A1, token_a: UUID_T1, token_b: UUID_T2 },
    ];
    mockSupabaseQuery(pools);

    const request = new Request("http://localhost/api/admin/pools");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pools).toBeDefined();
    expect(data.pools).toHaveLength(1);
  });

  it("filters by arena_id when provided", async () => {
    const pools = [{ id: "p1", arena_id: UUID_A1 }];
    const chain = mockSupabaseQuery(pools);

    const request = new Request(
      `http://localhost/api/admin/pools?arena_id=${UUID_A1}`
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("arena_id", UUID_A1);
  });

  it("returns 500 on database error", async () => {
    mockSupabaseQuery(null, { message: "db error" });

    const request = new Request("http://localhost/api/admin/pools");
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe("POST /api/admin/pools", () => {
  it("returns 401 when not authenticated", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const request = new Request("http://localhost/api/admin/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        arena_id: UUID_A1,
        token_a: UUID_T1,
        token_b: UUID_T2,
        reserve_a: 1000,
        reserve_b: 1000,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    });
    (verifySession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user1",
      walletAddress: "0xabc",
    });
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      authorized: false,
      error: "Admin access required",
    });

    const request = new Request("http://localhost/api/admin/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        arena_id: UUID_A1,
        token_a: UUID_T1,
        token_b: UUID_T2,
        reserve_a: 1000,
        reserve_b: 1000,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it("returns 400 on invalid body (missing reserve_a)", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    });
    (verifySession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user1",
      walletAddress: "0xadmin",
    });
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      authorized: true,
    });

    const request = new Request("http://localhost/api/admin/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        arena_id: UUID_A1,
        token_a: UUID_T1,
        token_b: UUID_T2,
        reserve_b: 1000,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("creates a pool when admin and valid body", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    });
    (verifySession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user1",
      walletAddress: "0xadmin",
    });
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      authorized: true,
    });

    const createdPool = {
      id: "p1",
      arena_id: UUID_A1,
      token_a: UUID_T1,
      token_b: UUID_T2,
      reserve_a: 1000,
      reserve_b: 1000,
      fee_rate: 0.003,
    };
    (createPool as ReturnType<typeof vi.fn>).mockResolvedValue(createdPool);

    const request = new Request("http://localhost/api/admin/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        arena_id: UUID_A1,
        token_a: UUID_T1,
        token_b: UUID_T2,
        reserve_a: 1000,
        reserve_b: 1000,
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.pool).toBeDefined();
    expect(data.pool.arena_id).toBe(UUID_A1);
  });
});
