import { describe, it, expect } from "vitest";

describe("supabase server clients", () => {
  it("exports createServerClient function", async () => {
    const mod = await import("@/lib/supabase-server");
    expect(typeof mod.createServerClient).toBe("function");
  });

  it("exports createServiceClient function", async () => {
    const mod = await import("@/lib/supabase-server");
    expect(typeof mod.createServiceClient).toBe("function");
  });
});
