// Per-user scan quota. Replaces the old binary `tier: "approved"` gate with a
// count of scans remaining. The authoritative balance lives in Clerk
// publicMetadata; this module only derives the gate from it.

export const DEFAULT_SCANS = 2;

type ScanMetadata = Record<string, unknown> | null | undefined;

/**
 * Remaining scans for a user, or `null` when access is unlimited.
 *
 * Legacy `tier: "approved"` accounts act as an admin bypass (unlimited). A
 * missing `scansRemaining` is treated as the just-in-time default, so a
 * never-seeded new user starts with {@link DEFAULT_SCANS} before their first
 * scan is ever written to Clerk.
 */
export function scansRemaining(metadata: ScanMetadata): number | null {
  if (metadata?.tier === "approved") {
    return null;
  }
  const raw = metadata?.scansRemaining;
  return typeof raw === "number" ? raw : DEFAULT_SCANS;
}

/** Whether the user may start another scan (unlimited, or balance > 0). */
export function hasScanAccess(metadata: ScanMetadata): boolean {
  const remaining = scansRemaining(metadata);
  return remaining === null || remaining > 0;
}
