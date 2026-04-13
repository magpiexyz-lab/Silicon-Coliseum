import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimiter } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows requests under the read limit (30/min)", () => {
    for (let i = 0; i < 30; i++) {
      const result = rateLimit("192.168.1.1", "read");
      expect(result.success).toBe(true);
    }
  });

  it("blocks read requests exceeding 30/min", () => {
    for (let i = 0; i < 30; i++) {
      rateLimit("192.168.1.1", "read");
    }
    const result = rateLimit("192.168.1.1", "read");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("allows requests under the write limit (10/min)", () => {
    for (let i = 0; i < 10; i++) {
      const result = rateLimit("192.168.1.1", "write");
      expect(result.success).toBe(true);
    }
  });

  it("blocks write requests exceeding 10/min", () => {
    for (let i = 0; i < 10; i++) {
      rateLimit("192.168.1.1", "write");
    }
    const result = rateLimit("192.168.1.1", "write");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks read and write limits independently", () => {
    for (let i = 0; i < 10; i++) {
      rateLimit("192.168.1.1", "write");
    }
    // Write limit exhausted
    expect(rateLimit("192.168.1.1", "write").success).toBe(false);
    // Read limit still available
    expect(rateLimit("192.168.1.1", "read").success).toBe(true);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 30; i++) {
      rateLimit("192.168.1.1", "read");
    }
    // IP 1 is exhausted
    expect(rateLimit("192.168.1.1", "read").success).toBe(false);
    // IP 2 is fresh
    expect(rateLimit("192.168.1.2", "read").success).toBe(true);
  });

  it("returns remaining count", () => {
    const result = rateLimit("10.0.0.1", "read");
    expect(result.remaining).toBe(29);
  });

  it("returns 0 remaining when limit exceeded", () => {
    for (let i = 0; i < 31; i++) {
      rateLimit("10.0.0.1", "read");
    }
    const result = rateLimit("10.0.0.1", "read");
    expect(result.remaining).toBe(0);
  });
});
