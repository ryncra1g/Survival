import { requireSession } from "@/lib/server/http";
import { store } from "@/lib/server/store";
import { BRAND } from "@/lib/brand";

/** GDPR/CCPA data export: everything we hold about the user, decrypted, as JSON. */
export async function GET() {
  const auth = await requireSession("full");
  if (!auth) return new Response("Sign in first", { status: 401 });
  const [questionnaires, plans, emailEvents] = await Promise.all([
    store.listQuestionnaires(auth.user.id),
    store.listPlans(auth.user.id),
    store.listEmailEvents(auth.user.id),
  ]);
  const data = { exportedAt: new Date().toISOString(), user: auth.user, questionnaires, plans, emailEvents };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${BRAND.slug}-my-data.json"`, "Cache-Control": "no-store" },
  });
}
