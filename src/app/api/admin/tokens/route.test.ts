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

import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-server";

// Lazy import so mocks are in place
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
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe("GET /api/admin/tokens", () => {
  it("returns a list of platform tokens", async () => {
    const tokens = [
      { id: "t1", symbol: "USDC", name: "USD Coin" },
      { id: "t2", symbol: "PEPE", name: "Pepe" },
    ];
    mockSupabaseQuery(tokens);

    const request = new Request("http://localhost/api/admin/tokens");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokens).toBeDefined();
    expect(data.tokens).toHaveLength(2);
  });

  it("returns 500 on database error", async () => {
    mockSupabaseQuery(null, { message: "db error" });

    const request = new Request("http://localhost/api/admin/tokens");
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe("POST /api/admin/tokens", () => {
  it("returns 401 when not authenticated", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const request = new Request("http://localhost/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "TEST", name: "Test Token" }),
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

    const request = new Request("http://localhost/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "TEST", name: "Test Token" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it("returns 400 on invalid body (missing symbol)", async () => {
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

    const request = new Request("http://localhost/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Token" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("creates a token when admin and valid body", async () => {
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

    const createdToken = { id: "t1", symbol: "TEST", name: "Test Token" };
    mockSupabaseQuery(createdToken);

    const request = new Request("http://localhost/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "TEST", name: "Test Token" }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toBeDefined();
    expect(data.token.symbol).toBe("TEST");
  });
});
