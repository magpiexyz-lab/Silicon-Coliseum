import { describe, it, expect, vi, beforeEach } from "vitest";

// Set JWT_SECRET before importing auth module
vi.stubEnv("JWT_SECRET", "test-secret-key-that-is-at-least-32-chars-long");

import { createSession, verifySession } from "@/lib/auth";

describe("auth - JWT session management", () => {
  it("createSession returns a JWT string", async () => {
    const token = await createSession("user-123", "0xabc123");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });

  it("verifySession returns payload for a valid token", async () => {
    const token = await createSession("user-456", "0xdef789");
    const payload = await verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-456");
    expect(payload!.walletAddress).toBe("0xdef789");
  });

  it("verifySession returns null for an invalid token", async () => {
    const payload = await verifySession("invalid.jwt.token");
    expect(payload).toBeNull();
  });

  it("verifySession returns null for a tampered token", async () => {
    const token = await createSession("user-789", "0x111222");
    // Tamper with the payload
    const parts = token.split(".");
    parts[1] = "dGFtcGVyZWQ"; // "tampered" in base64
    const tampered = parts.join(".");
    const payload = await verifySession(tampered);
    expect(payload).toBeNull();
  });
});
