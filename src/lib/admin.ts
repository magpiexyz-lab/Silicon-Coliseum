/**
 * Admin utility — checks if a user is an admin.
 * Admin wallets are configured via ADMIN_WALLET_ADDRESSES env var (comma-separated).
 */

export function isAdmin(walletAddress: string): boolean {
  const adminWallets = process.env.ADMIN_WALLET_ADDRESSES || "";
  const admins = adminWallets
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(walletAddress.toLowerCase());
}

/**
 * Middleware helper: returns 403 if not admin.
 */
export function requireAdmin(walletAddress: string | null): { authorized: boolean; error?: string } {
  if (!walletAddress) {
    return { authorized: false, error: "Authentication required" };
  }
  if (!isAdmin(walletAddress)) {
    return { authorized: false, error: "Admin access required" };
  }
  return { authorized: true };
}
