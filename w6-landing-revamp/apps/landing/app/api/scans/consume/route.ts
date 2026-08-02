import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { scansRemaining } from "../../../utils/scans";

// Authoritative scan-quota gate. Reads the live balance from Clerk (the JWT
// claim the worker sees can lag by the token cache TTL) and atomically spends
// one scan, seeding new users from the just-in-time default on first use.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const remaining = scansRemaining(user.publicMetadata);

  // Unlimited (approved) accounts never spend a scan.
  if (remaining === null) {
    return NextResponse.json({ remaining: null, unlimited: true });
  }

  if (remaining <= 0) {
    return NextResponse.json(
      { error: "no_scans_remaining", remaining: 0 },
      { status: 402 },
    );
  }

  const next = remaining - 1;
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { scansRemaining: next },
  });

  return NextResponse.json({ remaining: next });
}
