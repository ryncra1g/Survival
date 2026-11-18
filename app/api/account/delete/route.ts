import { err, json, requireSession, sameOrigin } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

/** Delete-my-data: removes the user, answers, plans, PDFs, tokens and email history. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  await store.deleteUserCascade(auth.user.id);
  await clearSession();
  return json({ ok: true });
}
