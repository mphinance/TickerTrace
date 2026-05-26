import { headers } from "next/headers";
import { whopSdk } from "./whop-sdk";

/**
 * Verify the Whop user JWT off the incoming request headers. Returns the
 * userId on success, null on any failure (no headers, expired token, bad
 * signature). Used by every authenticated server page — call once at the
 * top, branch on the result.
 *
 * We swallow the error and return null rather than throwing because the
 * page wants to render a "this only works inside Whop" notice instead of
 * a 500 when someone hits the bare URL.
 */
export async function getWhopUserId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    return userId ?? null;
  } catch {
    return null;
  }
}

/** Resolve the user's public profile, or null if unavailable. Best-effort
 *  — used for greeting copy only, never gating. */
export async function getWhopUser() {
  const userId = await getWhopUserId();
  if (!userId) return null;
  try {
    return await whopSdk.users.getUser({ userId });
  } catch {
    return null;
  }
}
