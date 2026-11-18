/**
 * Consent captured before a plan is built (clickwrap Terms + separate consent for health-adjacent answers).
 * Pure functions so the client, the API route and tests share one rule.
 */

/** Bump when app/terms/page.tsx changes in substance; it's stored with every plan. */
export const TERMS_VERSION = "2026-11-18";

export interface PlanConsent {
  termsVersion: string;
  termsAcceptedAt: string;
  /** Set only when the household answered "yes" to a health-adjacent question. */
  healthDataConsentAt: string | null;
}

export interface ConsentInput {
  terms?: unknown;
  health?: unknown;
}

type HealthAnswers = { hasPrescriptions?: boolean; poweredDevices?: unknown[]; elderlyOrMobility?: boolean };

/** True when any answer reveals something about someone's health (prescriptions, powered devices, mobility). */
export function needsHealthConsent(a: HealthAnswers): boolean {
  return !!a.hasPrescriptions || !!a.elderlyOrMobility || (Array.isArray(a.poweredDevices) && a.poweredDevices.length > 0);
}

export const TERMS_REQUIRED_MSG = "Please tick the box to agree to the Terms of Use before we build your plan.";
export const HEALTH_REQUIRED_MSG =
  "Please tick the box to let us use your medical and mobility answers to build your plan (or change those answers to No).";

/** Returns an error message, or null when the consent is complete for these answers. */
export function checkConsent(a: HealthAnswers, c: ConsentInput | null | undefined): string | null {
  if (c?.terms !== true) return TERMS_REQUIRED_MSG;
  if (needsHealthConsent(a) && c?.health !== true) return HEALTH_REQUIRED_MSG;
  return null;
}

export function consentRecord(a: HealthAnswers, now: Date = new Date()): PlanConsent {
  const at = now.toISOString();
  return { termsVersion: TERMS_VERSION, termsAcceptedAt: at, healthDataConsentAt: needsHealthConsent(a) ? at : null };
}

/** Draft-only consent ticks. They must never be saved with answers (or a copied questionnaire would start pre-ticked). */
export function withoutConsentTicks<T extends Record<string, unknown>>(a: T): Omit<T, "_terms" | "_health"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _terms, _health, ...rest } = a;
  return rest;
}

/** True when a saved consent still covers rebuilding a plan from these answers (current Terms, health consent if needed). */
export function consentStillValid(a: HealthAnswers, c: PlanConsent | null | undefined): c is PlanConsent {
  if (!c || c.termsVersion !== TERMS_VERSION) return false;
  return !needsHealthConsent(a) || !!c.healthDataConsentAt;
}
