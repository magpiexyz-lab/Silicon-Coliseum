import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns status ok with a timestamp", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe("string");
    // Should be a valid ISO date string
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });
});
