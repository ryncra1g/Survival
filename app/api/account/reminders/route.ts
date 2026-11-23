import { ReminderPrefsSchema } from "@/lib/accountData";
import { flags } from "@/lib/flags";
import { err, json, readJson, requireSession, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

/** D12 email reminders (accounts track): opt-in, per maintenance item, separate from marketing. */
export async function GET() {
  if (!flags().accounts) return err("Not found", 404);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  return json({ prefs: await store.getReminderPrefs(auth.user.id) });
}

export async function PUT(req: Request) {
  if (!flags().accounts) return err("Not found", 404);
  if (!sameOrigin(req)) return err("Bad origin", 403);
  const auth = await requireSession("full");
  if (!auth) return err("Sign in first", 401);
  const body = await readJson<{ prefs?: unknown }>(req, 10_000);
  const parsed = ReminderPrefsSchema.safeParse(body?.prefs);
  if (!parsed.success) return err("Invalid reminder settings");
  await store.setReminderPrefs(auth.user.id, parsed.data);
  return json({ ok: true });
}
