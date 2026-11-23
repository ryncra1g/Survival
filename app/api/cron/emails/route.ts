import { renderConfirmReminder, renderFollowupEmail, renderReminderEmail, type FollowupKind } from "@/lib/email/render";
import { flags } from "@/lib/flags";
import { maintenanceItems } from "@/lib/plan/maintenance";
import { dueReminders } from "@/lib/reminders";
import { issueLink } from "@/lib/server/auth";
import { cronAuthorized } from "@/lib/server/cronAuth";
import type { ComputedPlan } from "@/lib/rules/engine";
import { env } from "@/lib/server/env";
import { metaFor, sendEmail } from "@/lib/server/mailer";
import { store } from "@/lib/server/store";
import { atLeast } from "@/lib/zip/profile";

export const maxDuration = 300;

/**
 * Daily follow-ups (Vercel Cron). Opt-in only: confirmed, follow-ups on, not unsubscribed.
 * Day 1, Day 3 and Day 30 after the latest plan; seasonal "winter" in November and "hurricane" in June
 * based on the plan's ZIP hazard profile. Each kind is sent at most once (per year for seasonal).
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get("authorization"), env.cronSecret)) return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const sent: Record<string, number> = {};
  for (const user of await store.listUsers()) {
    // One reminder to confirm, 1–6 days after signup, for people who built a plan but never confirmed.
    if (!user.double_opt_in_at && !user.unsubscribed_at) {
      const age = (now.getTime() - new Date(user.created_at).getTime()) / 86_400_000;
      if (age >= 1 && age < 6 && !(await store.hasEmailEvent(user.id, "sent:confirm_reminder")) && (await store.listPlans(user.id)).length) {
        const link = await issueLink(user.id, "confirm", "/account?confirmed=1");
        const m = renderConfirmReminder(link, metaFor(user.id));
        if (await sendEmail({ to: user.email, userId: user.id, type: "confirm_reminder", ...m })) sent.confirm_reminder = (sent.confirm_reminder ?? 0) + 1;
      }
      continue;
    }
    if (user.unsubscribed_at) continue;
    const plan = (await store.listPlans(user.id))[0];
    if (!plan) continue;
    // D12 (accounts track): opt-in maintenance reminders, a separate switch from marketing follow-ups.
    // At most one email per user per day, so a reminder takes the day's slot.
    if (flags().accounts) {
      const due = dueReminders(maintenanceItems(plan.computed_quantities as ComputedPlan), await store.getReminderPrefs(user.id), new Date(plan.created_at), now);
      const type = `reminder_${now.toISOString().slice(0, 10)}`;
      if (due.length && !(await store.hasEmailEvent(user.id, `sent:${type}`))) {
        const m = renderReminderEmail(due, `${env.appUrl}/plan/${plan.id}`, metaFor(user.id));
        if (await sendEmail({ to: user.email, userId: user.id, type, ...m })) sent.reminder = (sent.reminder ?? 0) + 1;
        continue;
      }
    }
    if (!user.followups_opt_in) continue;
    const ageDays = (now.getTime() - new Date(plan.created_at).getTime()) / 86_400_000;
    const profile = (plan.computed_quantities as ComputedPlan).profile;
    const due: [FollowupKind, string][] = [];
    if (ageDays >= 1 && ageDays < 3) due.push(["day1", "followup_day1"]);
    if (ageDays >= 3 && ageDays < 10) due.push(["day3", "followup_day3"]);
    if (ageDays >= 30 && ageDays < 40) due.push(["day30", "followup_day30"]);
    if (month === 11 && atLeast(profile.winter, "moderate")) due.push(["winter", `seasonal_winter_${year}`]);
    if (month === 6 && atLeast(profile.hurricane, "moderate")) due.push(["hurricane", `seasonal_hurricane_${year}`]);
    for (const [kind, type] of due) {
      if (await store.hasEmailEvent(user.id, `sent:${type}`)) continue;
      const m = renderFollowupEmail(kind, `${env.appUrl}/plan/${plan.id}`, metaFor(user.id));
      if (await sendEmail({ to: user.email, userId: user.id, type, marketing: true, ...m })) sent[kind] = (sent[kind] ?? 0) + 1;
      break; // at most one email per user per day
    }
  }
  const purgedAnonymous = await store.deleteStaleAnonQuestionnaires(30);
  return Response.json({ ok: true, sent, purgedAnonymous });
}
