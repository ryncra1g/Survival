import { z } from "zod";
import { mergeConstants } from "@/lib/rules/constants";
import { err, json, readJson, requireAdmin, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** Set the Amazon Associates tag. Saved as a new rule-constants version (merged with existing overrides). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const admin = await requireAdmin();
  if (!admin) return err("Forbidden", 403);
  const body = z.object({ amazonTag: z.string().trim().max(40) }).safeParse(await readJson(req));
  if (!body.success) return err("Invalid tag");
  const current = ((await store.latestRuleConstants())?.overrides ?? {}) as Record<string, unknown>;
  const overrides = { ...current, affiliate: { ...((current.affiliate as object) ?? {}), amazonTag: body.data.amazonTag } };
  try {
    mergeConstants(overrides);
  } catch {
    return err("Tags may contain letters, numbers and hyphens only (e.g. kinready-20).");
  }
  const row = await store.saveRuleConstants(overrides, admin.email);
  return json({ ok: true, version: row.version });
}
