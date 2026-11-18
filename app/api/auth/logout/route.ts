import { err, json, sameOrigin } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  await clearSession();
  return json({ ok: true });
}
