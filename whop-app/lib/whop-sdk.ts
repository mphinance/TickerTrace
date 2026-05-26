import { WhopServerSdk } from "@whop/api";

/**
 * Server-side Whop SDK instance, configured from env. Used inside server
 * components (and server actions, if we add any later) to:
 *   - verify a Whop user's JWT off the request headers
 *   - check whether a user is an admin of a given Whop company
 *   - load a user's public profile for greeting copy
 *
 * The agent user is a no-op for read flows but @whop/api still requires
 * it for some endpoints, so we wire it up at construction time. Company
 * id is optional and only set when present in env.
 */
export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "",
  appApiKey: process.env.WHOP_API_KEY ?? "",
  onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
});
