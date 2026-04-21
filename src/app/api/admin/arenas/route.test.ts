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

// Mock arena-manager
vi.mock("@/lib/arena-manager", () => ({
  createArena: vi.fn(),
  transitionPhase: vi.fn(),
  listArenas: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-server";
import {
  createArena,
  transitionPhase,
  listArenas,
} from "@/lib/arena-manager";

const UUID_A1 = "a0000000-0000-4000-a000-000000000001";

let GET: (request: Request) => Promise<Response>;
let POST: (request: Request) => Promise<Response>;
let PATCH: (request: Request) => Promise<Response>;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("./route");
  GET = mod.GET;
  POST = mod.POST;
  PATCH = mod.PATCH;
});

describe("GET /api/admin/arenas", () => {
  it("returns a list of arenas", async () => {
    const arenas = [
      { id: UUID_A1, name: "Arena 1", status: "active", phase: "prep" },
    ];
    (listArenas as ReturnType<typeof vi.fn>).mockResolvedValue(arenas);

    const request = new Request("http://localhost/api/admin/arenas");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.arenas).toBeDefined();
    expect(data.arenas).toHaveLength(1);
  });

  it("filters by status when provided", async () => {
    const arenas = [{ id: UUID_A1, name: "Arena 1", status: "active" }];
    (listArenas as ReturnType<typeof vi.fn>).mockResolvedValue(arenas);

    const request = new Request(
      "http://localhost/api/admin/arenas?status=active"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(listArenas).toHaveBeenCalledWith("active");
  });

  it("returns 500 on error", async () => {
    (listArenas as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("db error")
    );

    const request = new Request("http://localhost/api/admin/arenas");
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe("POST /api/admin/arenas", () => {
  it("returns 401 when not authenticated", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Arena" }),
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

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Arena" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
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

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("creates an arena when admin and valid body", async () => {
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

    const createdArena = {
      id: UUID_A1,
      name: "New Arena",
      status: "draft",
      phase: "prep",
    };
    (createArena as ReturnType<typeof vi.fn>).mockResolvedValue(createdArena);

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Arena", starting_balance: 10000 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.arena).toBeDefined();
    expect(data.arena.name).toBe("New Arena");
  });
});

describe("PATCH /api/admin/arenas", () => {
  it("returns 401 when not authenticated", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: UUID_A1, phase: "competition" }),
    });
    const response = await PATCH(request);

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

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: UUID_A1, phase: "competition" }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(403);
  });

  it("returns 400 when id is missing", async () => {
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

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "competition" }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });

  it("transitions phase when phase is provided", async () => {
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

    const updatedArena = {
      id: UUID_A1,
      name: "Arena 1",
      phase: "competition",
      status: "active",
    };
    (transitionPhase as ReturnType<typeof vi.fn>).mockResolvedValue(
      updatedArena
    );

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: UUID_A1, phase: "competition" }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.arena).toBeDefined();
    expect(data.arena.phase).toBe("competition");
    expect(transitionPhase).toHaveBeenCalledWith(UUID_A1, "competition");
  });

  it("updates fields directly when no phase transition", async () => {
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

    const updatedArena = {
      id: UUID_A1,
      name: "Renamed Arena",
      status: "active",
    };
    const chain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedArena, error: null }),
    };
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const request = new Request("http://localhost/api/admin/arenas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: UUID_A1, name: "Renamed Arena" }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.arena).toBeDefined();
  });
});
