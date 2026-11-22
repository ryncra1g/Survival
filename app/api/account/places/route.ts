import { PlacesSchema } from "@/lib/accountData";
import { flags } from "@/lib/flags";
import { err, json, readJson, requireSession, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** D4 My places (accounts track): a confirmed account's backup destinations, encrypted. Never used in emails, analytics or AI. */
export async function GET() {
  if (!flags().accounts) return err("Not found", 404);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  return json({ places: await store.getPlaces(auth.user.id) });
}

export async function PUT(req: Request) {
  if (!flags().accounts) return err("Not found", 404);
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  const body = await readJson<{ places?: unknown }>(req, 20_000);
  const parsed = PlacesSchema.safeParse(body?.places);
  if (!parsed.success) return err("Check the places and try again");
  await store.setPlaces(auth.user.id, parsed.data);
  return json({ ok: true });
}
