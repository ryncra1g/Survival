import { ERR } from "@/lib/errors";
import { z } from "zod";
import { err, json, readJson, requireSession, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  const body = z.object({ followups: z.boolean() }).safeParse(await readJson(req));
  if (!body.success) return err(ERR.save);
  await store.updateUser(auth.user.id, body.data.followups ? { followups_opt_in: true, unsubscribed_at: null } : { followups_opt_in: false });
  return json({ ok: true });
}
