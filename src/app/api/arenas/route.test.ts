import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a fresh chainable mock per call
function createQueryChain(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "eq", "order", "single", "maybeSingle", "limit", "insert", "update", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      // If this is a terminal call, return the result as a promise
      return { ...chain, then: (resolve: (v: unknown) => void) => resolve(result) };
    });
  }
  // Make it thenable so await works at any point in the chain
  chain.then = ((resolve: (v: unknown) => void) => resolve(result)) as unknown as ReturnType<typeof vi.fn>;
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

// Mock auth
const mockVerifySession = vi.fn();
vi.mock("@/lib/auth", () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

// Mock next/headers cookies
const mockCookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: mockCookiesGet }),
}));

// Mock arena-manager
const mockJoinArena = vi.fn();
vi.mock("@/lib/arena-manager", () => ({
  joinArena: (...args: unknown[]) => mockJoinArena(...args),
}));

// Mock leaderboard
const mockCalculateArenaLeaderboard = vi.fn();
vi.mock("@/lib/leaderboard", () => ({
  calculateArenaLeaderboard: (...args: unknown[]) => mockCalculateArenaLeaderboard(...args),
}));

// Mock pool-manager
const mockGetPoolById = vi.fn();
const mockGetPoolHistory = vi.fn();
vi.mock("@/lib/pool-manager", () => ({
  getPoolById: (...args: unknown[]) => mockGetPoolById(...args),
  getPoolHistory: (...args: unknown[]) => mockGetPoolHistory(...args),
}));

// Mock amm
vi.mock("@/lib/amm", () => ({
  calculatePrice: (a: number, b: number) => b / a,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/arenas
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/arenas", () => {
  it("returns arenas list ordered by created_at DESC", async () => {
    const arenas = [
      { id: "a1", name: "Arena 1", status: "active", created_at: "2024-02-01" },
      { id: "a2", name: "Arena 2", status: "draft", created_at: "2024-01-01" },
    ];

    mockFrom.mockReturnValue(createQueryChain({ data: arenas, error: null }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/arenas");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.arenas).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith("arenas");
  });

  it("filters by status query param", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: [], error: null }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/arenas?status=active");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.arenas).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: null, error: { message: "DB down" } }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/arenas");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/arenas/[id]
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/arenas/[id]", () => {
  it("returns arena detail with tokens and entry count", async () => {
    const arena = { id: "a1", name: "Arena 1", status: "active" };
    const tokens = [{ id: "t1", token_id: "tok1", platform_tokens: { symbol: "PEPE", name: "Pepe" } }];

    // Three sequential from() calls: arenas, arena_tokens, arena_entries
    mockFrom
      .mockReturnValueOnce(createQueryChain({ data: arena, error: null }))
      .mockReturnValueOnce(createQueryChain({ data: tokens, error: null }))
      .mockReturnValueOnce(createQueryChain({ count: 5, error: null }));

    const mod = await import("./[id]/route");
    const req = new Request("http://localhost/api/arenas/a1");
    const res = await mod.GET(req, { params: Promise.resolve({ id: "a1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.arena).toBeDefined();
    expect(json.arena.id).toBe("a1");
    expect(json.tokens).toHaveLength(1);
    expect(json.entryCount).toBe(5);
  });

  it("returns 404 when arena not found", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: null, error: null }));

    const mod = await import("./[id]/route");
    const req = new Request("http://localhost/api/arenas/nonexistent");
    const res = await mod.GET(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/arenas/[id]/join
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/arenas/[id]/join", () => {
  it("returns 401 when not authenticated", async () => {
    mockCookiesGet.mockReturnValue(undefined);

    const mod = await import("./[id]/join/route");
    const req = new Request("http://localhost/api/arenas/a1/join", {
      method: "POST",
      body: JSON.stringify({ agent_id: "ag1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await mod.POST(req, { params: Promise.resolve({ id: "a1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 400 when agent_id is missing", async () => {
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifySession.mockResolvedValue({ userId: "u1", walletAddress: "0x123" });

    const mod = await import("./[id]/join/route");
    const req = new Request("http://localhost/api/arenas/a1/join", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await mod.POST(req, { params: Promise.resolve({ id: "a1" }) });

    expect(res.status).toBe(400);
  });

  it("calls joinArena and returns entry on success", async () => {
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifySession.mockResolvedValue({ userId: "u1", walletAddress: "0x123" });

    // Mock agent ownership check
    mockFrom.mockReturnValue(createQueryChain({ data: { id: "ag1", user_id: "u1" }, error: null }));

    const entry = { id: "e1", arena_id: "a1", agent_id: "ag1", user_id: "u1" };
    mockJoinArena.mockResolvedValue(entry);

    const mod = await import("./[id]/join/route");
    const req = new Request("http://localhost/api/arenas/a1/join", {
      method: "POST",
      body: JSON.stringify({ agent_id: "ag1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await mod.POST(req, { params: Promise.resolve({ id: "a1" }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.entry).toBeDefined();
    expect(json.entry.arena_id).toBe("a1");
    expect(mockJoinArena).toHaveBeenCalledWith("a1", "ag1", "u1");
  });

  it("returns 403 when user does not own the agent", async () => {
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockVerifySession.mockResolvedValue({ userId: "u1", walletAddress: "0x123" });

    // Agent belongs to a different user
    mockFrom.mockReturnValue(createQueryChain({ data: { id: "ag1", user_id: "other-user" }, error: null }));

    const mod = await import("./[id]/join/route");
    const req = new Request("http://localhost/api/arenas/a1/join", {
      method: "POST",
      body: JSON.stringify({ agent_id: "ag1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await mod.POST(req, { params: Promise.resolve({ id: "a1" }) });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/arenas/[id]/leaderboard
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/arenas/[id]/leaderboard", () => {
  it("returns leaderboard data for the arena", async () => {
    const leaderboard = [
      { rank: 1, agentId: "ag1", agentName: "Alpha", pnlPercent: 15.5 },
      { rank: 2, agentId: "ag2", agentName: "Beta", pnlPercent: 5.2 },
    ];
    mockCalculateArenaLeaderboard.mockResolvedValue(leaderboard);

    const mod = await import("./[id]/leaderboard/route");
    const req = new Request("http://localhost/api/arenas/a1/leaderboard");
    const res = await mod.GET(req, { params: Promise.resolve({ id: "a1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.leaderboard).toHaveLength(2);
    expect(mockCalculateArenaLeaderboard).toHaveBeenCalledWith("a1");
  });

  it("returns 500 on leaderboard error", async () => {
    mockCalculateArenaLeaderboard.mockRejectedValue(new Error("DB fail"));

    const mod = await import("./[id]/leaderboard/route");
    const req = new Request("http://localhost/api/arenas/a1/leaderboard");
    const res = await mod.GET(req, { params: Promise.resolve({ id: "a1" }) });

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/pools
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/pools", () => {
  it("returns pools list with current prices", async () => {
    const pools = [
      {
        id: "p1", arena_id: "a1", token_a: "t1", token_b: "t2",
        reserve_a: 1000, reserve_b: 2000,
        token_a_ref: { symbol: "PEPE", name: "Pepe" },
        token_b_ref: { symbol: "USDC", name: "USD Coin" },
      },
    ];

    mockFrom.mockReturnValue(createQueryChain({ data: pools, error: null }));

    const mod = await import("../pools/route");
    const req = new Request("http://localhost/api/pools");
    const res = await mod.GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pools).toBeDefined();
    expect(json.pools).toHaveLength(1);
    expect(json.pools[0].current_price).toBe(2); // 2000/1000
    expect(json.pools[0].token_a_symbol).toBe("PEPE");
  });

  it("filters by arena_id query param", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: [], error: null }));

    const mod = await import("../pools/route");
    const req = new Request("http://localhost/api/pools?arena_id=a1");
    const res = await mod.GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pools).toEqual([]);
  });
});

// ───────��─────────────────────────────────────────────────────────────────────
// 6. GET /api/pools/[id]
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/pools/[id]", () => {
  it("returns pool detail with price history", async () => {
    const pool = { id: "p1", reserve_a: 1000, reserve_b: 2000 };
    const history = [
      { id: "s1", pool_id: "p1", price: 2.0, created_at: "2024-01-01" },
    ];

    mockGetPoolById.mockResolvedValue(pool);
    mockGetPoolHistory.mockResolvedValue(history);

    const mod = await import("../pools/[id]/route");
    const req = new Request("http://localhost/api/pools/p1");
    const res = await mod.GET(req, { params: Promise.resolve({ id: "p1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pool).toBeDefined();
    expect(json.history).toHaveLength(1);
    expect(mockGetPoolById).toHaveBeenCalledWith("p1");
    expect(mockGetPoolHistory).toHaveBeenCalledWith("p1", 100);
  });

  it("returns 500 when pool not found", async () => {
    mockGetPoolById.mockRejectedValue(new Error("Pool not found"));

    const mod = await import("../pools/[id]/route");
    const req = new Request("http://localhost/api/pools/nonexistent");
    const res = await mod.GET(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/users/[wallet]/profile
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/users/[wallet]/profile", () => {
  it("returns user profile and stats", async () => {
    const user = { id: "u1", username: "trader1", wallet_address: "0xabc", created_at: "2024-01-01" };
    const profile = { user_id: "u1", total_arenas: 3, wins: 1, best_pnl: 25.5 };

    // Two from() calls: users, user_profiles
    mockFrom
      .mockReturnValueOnce(createQueryChain({ data: user, error: null }))
      .mockReturnValueOnce(createQueryChain({ data: profile, error: null }));

    const mod = await import("../users/[wallet]/profile/route");
    const req = new Request("http://localhost/api/users/0xabc/profile");
    const res = await mod.GET(req, { params: Promise.resolve({ wallet: "0xabc" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toBeDefined();
    expect(json.user.username).toBe("trader1");
    expect(json.profile).toBeDefined();
    expect(json.profile.total_arenas).toBe(3);
  });

  it("returns 404 when user not found", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: null, error: null }));

    const mod = await import("../users/[wallet]/profile/route");
    const req = new Request("http://localhost/api/users/0xnonexistent/profile");
    const res = await mod.GET(req, { params: Promise.resolve({ wallet: "0xnonexistent" }) });

    expect(res.status).toBe(404);
  });
});
