import { InventorySchema, seedInventory } from "@/lib/accountData";
import { flags } from "@/lib/flags";
import { loadPlanFor } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

/**
 * D2 inventory (accounts track, behind ACCOUNTS_ENABLED). Saved on the plan, encrypted: without an
 * account it opens in this browser for 30 days; with a confirmed email, on any device.
 * Same access rule as the plan (loadPlanFor).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!flags().accounts) return err("Not found", 404);
  const plan = await loadPlanFor(await getSession(), (await params).id);
  if (!plan) return err("Not found", 404);
  return json({ inventory: seedInventory(plan.inventory, plan.checks) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!flags().accounts) return err("Not found", 404);
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const plan = await loadPlanFor(await getSession(), (await params).id);
  if (!plan) return err("Not found", 404);
  const body = await readJson<{ inventory?: unknown }>(req, 60_000);
  const parsed = InventorySchema.safeParse(body?.inventory);
  if (!parsed.success) return err("Invalid inventory");
  await store.updatePlan(plan.id, { inventory: parsed.data });
  return json({ ok: true });
}
