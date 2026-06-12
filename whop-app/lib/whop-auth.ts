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

/** A Whop access level for a resource. `admin` is the company owner / team
 *  member; `customer` is a paying member; `no_access` is everyone else. */
export type AccessLevel = "admin" | "customer" | "no_access";

/**
 * Resolve the current user's id and their access level to a given experience.
 * Returns null when there's no verifiable Whop session at all.
 *
 * This is the gate for creator-only surfaces (e.g. the broadcast composer):
 * the page can show admin UI, but every privileged *action* must re-check
 * this server-side — never trust a client-passed "isAdmin".
 */
export async function getExperienceAccess(
  experienceId: string,
): Promise<{ userId: string; accessLevel: AccessLevel } | null> {
  const userId = await getWhopUserId();
  if (!userId) return null;
  try {
    const access = await whopSdk.access.checkIfUserHasAccessToExperience({
      userId,
      experienceId,
    });
    return { userId, accessLevel: access.accessLevel as AccessLevel };
  } catch {
    // Bad experience id or a misconfigured SDK — treat as no access rather
    // than throwing a 500 into the iframe.
    return { userId, accessLevel: "no_access" };
  }
}
