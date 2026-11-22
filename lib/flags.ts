/**
 * Feature flags (owner brief D1, D3b). Read on the server from env; a flag is on only for the exact
 * value "true". Defaults are OFF and must stay off: the owner turns them on.
 *
 * - ACCOUNTS_ENABLED: the accounts track (My plans, inventory, My places, reminders, dashboard tabs).
 * - DIY_TIPS_ENABLED: "No time to buy? Use what you have" boxes, off until the owner approves docs/FACTCHECK.md.
 *
 * Client components never read env themselves: server components pass `flags()` down as a prop.
 */
export type Flags = { accounts: boolean; diyTips: boolean };

export const FLAG_ENV = { accounts: "ACCOUNTS_ENABLED", diyTips: "DIY_TIPS_ENABLED" } as const;

export function flagOn(value: string | undefined): boolean {
  return value === "true";
}

export function flags(env: Record<string, string | undefined> = process.env): Flags {
  return { accounts: flagOn(env[FLAG_ENV.accounts]), diyTips: flagOn(env[FLAG_ENV.diyTips]) };
}

export const NO_FLAGS: Flags = { accounts: false, diyTips: false };
