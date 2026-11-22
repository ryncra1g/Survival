import { z } from "zod";
import { loadPlanFor } from "@/lib/server/access";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

const Body = z.object({ checks: z.record(z.string().regex(/^[a-z0-9-]{1,40}$/), z.boolean()).refine((c) => Object.keys(c).length <= 300) });

/** Save checklist ticks on the plan for 30 days in this browser, or on any device once the email is confirmed. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const { id } = await params;
  const plan = await loadPlanFor(await getSession(), id);
  if (!plan) return err("Not found", 404);
  const body = Body.safeParse(await readJson(req, 20_000));
  if (!body.success) return err("Invalid");
  await store.updatePlan(plan.id, { checks: Object.fromEntries(Object.entries(body.data.checks).filter(([, v]) => v)) });
  return json({ ok: true });
}
