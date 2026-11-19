"use client";
import type { ReactNode } from "react";
import { useChecks } from "./ChecksContext";

/** The tick id for "I already have this" on the dashboard's gear list. */
export const gotId = (itemId: string) => `got-${itemId}`;

/** Hides a Buy button once the person has ticked "Got it" for that item, so the plan never sells what they own. */
export function BuyIfNeeded({ itemId, children }: { itemId: string; children: ReactNode }) {
  const { checks } = useChecks();
  return checks[gotId(itemId)] ? null : <>{children}</>;
}
