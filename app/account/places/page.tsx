import type { Metadata } from "next";
import { PlacesEditor } from "@/components/PlacesEditor";
import { accountPageUser } from "@/lib/server/accountPage";
import { store } from "@/lib/server/store";

/** Read ACCOUNTS_ENABLED and the session per request (never prerendered at build time). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My places", robots: { index: false } };

/** D4 (accounts track): backup destinations saved to the account (encrypted), with a printable page. */
export default async function MyPlaces() {
  const user = await accountPageUser();
  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-3">
      <h1 className="text-2xl font-bold no-print">My places</h1>
      <h1 className="hidden print:block text-3xl font-bold">If we have to leave, we go to:</h1>
      <p className="text-muted no-print">Where you&apos;d go if you had to leave home. Saved to your account and encrypted. We never use these addresses in emails, analytics or AI.</p>
      <PlacesEditor initial={await store.getPlaces(user.id)} />
    </div>
  );
}
