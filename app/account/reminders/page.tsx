import type { Metadata } from "next";
import { ReminderSettings } from "@/components/ReminderSettings";
import { maintenanceItems } from "@/lib/plan/maintenance";
import type { ComputedPlan } from "@/lib/rules/engine";
import { accountPageUser } from "@/lib/server/accountPage";
import { store } from "@/lib/server/store";

/** Read ACCOUNTS_ENABLED and the session per request (never prerendered at build time). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reminders", robots: { index: false } };

/** D12 (accounts track): opt-in email reminders, per maintenance item, from the newest plan's schedule. */
export default async function Reminders() {
  const user = await accountPageUser();
  const [latest] = await store.listPlans(user.id);
  const items = latest ? maintenanceItems(latest.computed_quantities as ComputedPlan) : [];
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-3">
      <h1 className="text-2xl font-bold">Reminders</h1>
      <p className="text-muted">Get an email when it&apos;s time to test alarms, rotate water and check your supplies.</p>
      <ReminderSettings initial={await store.getReminderPrefs(user.id)} items={items.map(({ id, when, task }) => ({ id, when, task }))} />
    </div>
  );
}
