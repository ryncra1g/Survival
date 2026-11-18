/**
 * The product name lives here and nowhere else. The final name is undecided ("table the name"):
 * set NEXT_PUBLIC_BRAND_NAME at build time to rename every page, email, PDF and filename at once.
 *
 * WORKING_NAME is a placeholder only — "ReadyPlan" is already used by another emergency-planning app,
 * so /release-check refuses to ship while it's still in use.
 */
export const WORKING_NAME = "ReadyPlan";

const name = (process.env.NEXT_PUBLIC_BRAND_NAME ?? "").trim() || WORKING_NAME;

export const BRAND = {
  name,
  /** Filename-safe form, e.g. "ReadyPlan" → "ReadyPlan", "Calm Prep" → "Calm-Prep". */
  file: name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan",
  /** Lowercase slug for examples and the HTTP header. */
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan",
} as const;

export const usingWorkingName = name === WORKING_NAME;
