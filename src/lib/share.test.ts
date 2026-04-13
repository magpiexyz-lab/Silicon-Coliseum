import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase-server
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock("./supabase-server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

// Import after mocking
const { generateShareToken, validateShareToken } = await import("./share");

beforeEach(() => {
  vi.clearAllMocks();

  // Default chain: from -> insert -> (resolves)
  // or from -> select -> eq -> maybeSingle -> (resolves)
  mockFrom.mockImplementation((table: string) => {
    if (table === "share_tokens") {
      return {
        insert: mockInsert,
        select: mockSelect,
      };
    }
    return { insert: mockInsert, select: mockSelect };
  });

  mockInsert.mockReturnValue({ error: null });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
});

describe("generateShareToken", () => {
  it("generates a hex token string", async () => {
    mockInsert.mockReturnValue({ error: null });

    const token = await generateShareToken("agent-123");

    expect(typeof token).toBe("string");
    expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
  });

  it("inserts the token into share_tokens table", async () => {
    mockInsert.mockReturnValue({ error: null });

    await generateShareToken("agent-123");

    expect(mockFrom).toHaveBeenCalledWith("share_tokens");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-123",
        token: expect.any(String),
      })
    );
  });

  it("throws on database error", async () => {
    mockInsert.mockReturnValue({ error: { message: "DB error" } });

    await expect(generateShareToken("agent-123")).rejects.toThrow(
      "Failed to create share token"
    );
  });
});

describe("validateShareToken", () => {
  it("returns agentId for a valid token", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { agent_id: "agent-456" },
      error: null,
    });

    const result = await validateShareToken("valid-token");

    expect(result).toEqual({ agentId: "agent-456" });
  });

  it("returns null for an invalid token", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await validateShareToken("nonexistent-token");

    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const result = await validateShareToken("error-token");

    expect(result).toBeNull();
  });
});
