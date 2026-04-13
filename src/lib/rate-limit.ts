const WINDOW_MS = 60 * 1000; // 1 minute window

const LIMITS: Record<string, number> = {
  read: 30,
  write: 10,
};

interface RateLimitEntry {
  timestamps: number[];
}

// Store: key = "ip:type" -> timestamps of requests within window
const store = new Map<string, RateLimitEntry>();

// Cleanup interval: remove stale entries every 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // Allow the process to exit without waiting for cleanup
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

export function rateLimit(
  ip: string,
  type: "read" | "write"
): { success: boolean; remaining: number } {
  startCleanup();

  const key = `${ip}:${type}`;
  const limit = LIMITS[type];
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  const remaining = limit - entry.timestamps.length;

  return { success: true, remaining };
}

// Reset all rate limit state (for testing)
export function resetRateLimiter() {
  store.clear();
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
