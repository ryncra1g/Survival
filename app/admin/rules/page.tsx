import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { store } from "@/lib/server/store";
import { RulesEditor } from "./editor";
import { adminOrNotFound } from "../guard";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  await adminOrNotFound();
  const row = await store.latestRuleConstants();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Rule constants</h1>
      <p className="text-muted">Overrides are deep-merged over the defaults and validated before saving. Changes apply to new plans immediately — no redeploy. Current version: {row?.version ?? 0}{row ? ` (by ${row.created_by}, ${row.created_at.slice(0, 16)})` : " (defaults)"}.</p>
      <RulesEditor initial={JSON.stringify(row?.overrides ?? {}, null, 2)} defaults={JSON.stringify(DEFAULT_CONSTANTS, null, 2)} />
    </div>
  );
}
