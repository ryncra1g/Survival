import { DEFAULT_CONSTANTS, mergeConstants } from "@/lib/rules/constants";
import { err, json, readJson, requireAdmin, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

export async function GET() {
  if (!(await requireAdmin())) return err("Forbidden", 403);
  const row = await store.latestRuleConstants();
  return json({ defaults: DEFAULT_CONSTANTS, overrides: row?.overrides ?? {}, version: row?.version ?? 0 });
}

/** Save a new version of rule-constant overrides. Validated by merging over defaults. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const admin = await requireAdmin();
  if (!admin) return err("Forbidden", 403);
  const body = await readJson<{ overrides: unknown }>(req, 200_000);
  if (!body || typeof body.overrides !== "object" || body.overrides === null) return err("Send { overrides: {...} }");
  try {
    mergeConstants(body.overrides);
  } catch (e) {
    return err(`Invalid constants: ${(e as Error).message.slice(0, 500)}`);
  }
  const row = await store.saveRuleConstants(body.overrides, admin.email);
  return json({ version: row.version });
}
