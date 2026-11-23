/**
 * Top-right site menu (owner brief D9 / LP-01). Only features that exist are listed:
 * the accounts-track items appear only when ACCOUNTS_ENABLED is on and the person is signed in.
 */
export type MenuItem = { label: string; href: string } | { label: "Sign out"; action: "signout" };
export type MenuState = { signedIn: boolean; accounts: boolean };

export const VISITOR_ITEMS: { label: string; href: string }[] = [
  { label: "Help", href: "/help" },
  { label: "About", href: "/about" },
  { label: "Sources & safety", href: "/sources" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

/** Accounts-track pages (Batch D). Never shown while ACCOUNTS_ENABLED is off. */
export const ACCOUNT_ITEMS: { label: string; href: string }[] = [
  { label: "My plans", href: "/account/plans" },
  { label: "Household & inventory", href: "/account/inventory" },
  { label: "My places", href: "/account/places" },
  { label: "Reminders", href: "/account/reminders" },
];

export function menuItems({ signedIn, accounts }: MenuState): MenuItem[] {
  if (!signedIn) return [{ label: "Sign in", href: "/account" }, ...VISITOR_ITEMS];
  return [
    ...(accounts ? ACCOUNT_ITEMS : [{ label: "My plan", href: "/account" }]),
    { label: "Privacy & data", href: "/account#data" },
    ...VISITOR_ITEMS,
    { label: "Sign out", action: "signout" },
  ];
}
