import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth module
vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: vi.fn(),
}));

import { getSessionFromRequest } from "@/lib/auth";
const mockGetSession = vi.mocked(getSessionFromRequest);

const { middleware } = await import("./middleware");

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

beforeEach(() => {
  mockGetSession.mockReset();
});

describe("middleware", () => {
  it("redirects unauthenticated users from /dashboard to /login", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await middleware(makeRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows authenticated users to access /dashboard", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-1",
      walletAddress: "0x123",
    });

    const response = await middleware(makeRequest("/dashboard"));

    expect(response.status).toBe(200);
  });

  it("redirects authenticated users away from /login to /dashboard", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-1",
      walletAddress: "0x123",
    });

    const response = await middleware(makeRequest("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("allows unauthenticated users to access /login", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await middleware(makeRequest("/login"));

    expect(response.status).toBe(200);
  });

  it("redirects authenticated users away from /signup to /dashboard", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-1",
      walletAddress: "0x123",
    });

    const response = await middleware(makeRequest("/signup"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("allows unauthenticated users to access /signup", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await middleware(makeRequest("/signup"));

    expect(response.status).toBe(200);
  });

  it("protects nested /dashboard routes", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await middleware(makeRequest("/dashboard/settings"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });
});
