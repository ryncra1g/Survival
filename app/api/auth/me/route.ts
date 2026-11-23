import { flags } from "@/lib/flags";
import { json } from "@/lib/server/http";
import { getSession } from "@/lib/server/session";

/** Menu state only: whether this browser is signed in, and whether the accounts track is on. No personal data. */
export async function GET() {
  const s = await getSession();
  return json({ signedIn: s?.scope === "full", accounts: flags().accounts });
}
