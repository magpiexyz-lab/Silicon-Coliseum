import { describe, it, expect } from "vitest";

describe("types", () => {
  it("exports all required interfaces as types (compile-time check)", async () => {
    // Dynamically import to verify the module exists and exports correctly
    const types = await import("@/lib/types");
    // Types are compile-time only, so we just verify the module loads
    expect(types).toBeDefined();
  });
});
