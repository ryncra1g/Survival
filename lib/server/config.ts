import "server-only";
import { mergeConstants, type RuleConstants } from "@/lib/rules/constants";
import { store } from "./store";

/** Latest admin-edited rule constants merged over defaults (no redeploy needed). */
export async function loadConstants(): Promise<{ constants: RuleConstants; version: number }> {
  const row = await store.latestRuleConstants();
  try {
    return { constants: mergeConstants(row?.overrides ?? {}), version: row?.version ?? 0 };
  } catch (e) {
    console.error("[rules] stored overrides invalid, using defaults", e);
    return { constants: mergeConstants({}), version: 0 };
  }
}
