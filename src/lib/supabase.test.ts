import { describe, it, expect } from "vitest";

describe("supabase browser client", () => {
  it("exports isDemoMode as true when no env vars set", async () => {
    const mod = await import("@/lib/supabase");
    expect(mod.isDemoMode).toBe(true);
  });

  it("exports supabase client (null in demo mode)", async () => {
    const mod = await import("@/lib/supabase");
    expect(mod).toHaveProperty("supabase");
  });
});
