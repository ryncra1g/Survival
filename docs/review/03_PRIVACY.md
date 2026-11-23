# Privacy

## Copy for your AI assistant

### `lib/plan/aiSummary.ts`

````ts
import type { Answers } from "@/lib/answers/schema";
import { BRAND } from "@/lib/brand";
import { lookupZip } from "@/lib/zip/profile";
import type { Block, PlanDocument } from "./document";

/**
 * D12b: "Copy for your AI assistant". A plain-text summary to paste into ChatGPT, Claude or Gemini.
 *
 * Built from an allow-list only: household counts, region (never the ZIP), scenario length, the key amounts
 * from the plan's overview, the maintenance schedule and the first steps. Health answers, consent records and
 * addresses are never read. Any line that mentions a health topic is dropped as a second guard.
 * Ground rules are word for word from the owner's brief (docs/FACTCHECK.md).
 */
export const AI_GROUND_RULES = [
  "Use these amounts exactly; don't recalculate them.",
  "Follow the product label and CDC/EPA guidance for water treatment; never give dosages.",
  "Never suggest grills, generators or heaters indoors or in a garage.",
  "Official evacuation orders override this plan.",
  `This plan's numbers come from ${BRAND.name}; your assistant's advice is its own.`,
];

export const AI_EXPLAINER =
  "Copies a summary of your plan to paste into ChatGPT, Claude or Gemini, so it can set reminders and answer questions. Health details and addresses aren't included.";
export const AI_COPIED = "Copied. Paste it into your AI assistant to get started.";

/** Health topics never leave the plan in this summary. */
export const HEALTH_WORDS = /\b(cpap|bipap|oxygen|nebuli[sz]er|medic(al|ation|ine)s?|prescri\w*|pharmac\w*|insulin|dialysis|mobility|wheelchair|powered device|health|diagnos\w*|dose|dosing|dosage)\b/i;

const DAYS: Record<number, string> = { 3: "72 hours", 14: "2 weeks", 30: "30 days", 90: "90 days" };

/** Drop clauses about health (e.g. "medication lists") but keep the rest of a schedule line. */
function withoutHealth(task: string): string {
  const parts = task.replace(/\.$/, "").split(/;\s*/);
  const keep = parts.map((p) => (HEALTH_WORDS.test(p) ? p.split(/,\s*(?:and\s+)?|\s+and\s+/).filter((x) => !HEALTH_WORDS.test(x)).join(", ") : p)).filter(Boolean);
  return keep.length ? keep.join("; ") + "." : "";
}

type Checklist = Extract<Block, { type: "checklist" }>;
type Table = Extract<Block, { type: "table" }>;

export function aiSummary(doc: PlanDocument, a: Answers): string {
  const region = lookupZip(a.zip).region;
  const kids = a.childrenAges.length;
  const pets = a.pets.reduce((t, p) => t + p.count, 0);
  const who = [`${a.adults} adult${a.adults === 1 ? "" : "s"}`, ...(kids ? [`${kids} child${kids === 1 ? "" : "ren"}`] : []), ...(pets ? [`${pets} pet${pets === 1 ? "" : "s"}`] : [])].join(", ");

  const amounts = (doc.overview?.stats ?? []).map((s) => `- ${s.label}: ${s.value} (${s.math})`);
  const maint = doc.sections.find((s) => s.id === "maintenance")?.blocks.find((b): b is Table => b.type === "table")?.rows.map((r) => [r[0], withoutHealth(r[1])]).filter((r) => r[1]).map((r) => `- ${r[0]}: ${r[1]}`) ?? [];
  const firstSteps = (doc.sections.find((s) => s.id === "priorities")?.blocks.find((b): b is Checklist => b.type === "checklist")?.items ?? [])
    .map((i) => i.text)
    .filter((t) => !HEALTH_WORDS.test(t))
    .slice(0, 3)
    .map((t, i) => `${i + 1}. ${t}`);

  const lines = [
    `My household emergency plan (from ${BRAND.name})`,
    "",
    "Household",
    `- ${who}`,
    `- Region: ${region}`,
    `- Planning for: ${DAYS[a.scenarioDays] ?? `${a.scenarioDays} days`} without normal services`,
    "",
    "Key amounts",
    ...amounts,
    "",
    "Maintenance schedule",
    ...maint,
    "",
    "My first steps",
    ...firstSteps,
    "",
    "Ground rules for you, the assistant",
    ...AI_GROUND_RULES.map((r) => `- ${r}`),
    "",
    "What I'd like help with",
    "- Set reminders for the dates in the maintenance schedule.",
    "- Help me with my first 3 steps.",
  ];
  return lines.filter((l) => !HEALTH_WORDS.test(l) || AI_GROUND_RULES.some((r) => l.includes(r))).join("\n");
}
````

## Reminder emails in the cron

`app/api/cron/emails/route.ts:39-49`

````ts
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
````

`lib/email/render.ts:208-213` (the reminder email body)

````ts
/** D12 (accounts track): opt-in maintenance reminder. Task text only: no links to stores, no health details, no addresses. */
export function renderReminderEmail(tasks: { when: string; task: string }[], planUrl: string, meta: EmailMeta) {
  const subject = tasks.length === 1 ? `Reminder: ${tasks[0].task}` : `${tasks.length} preparedness checks are due`;
  const body = `<h1 style="margin:0 0 8px;font-size:22px">Time for a quick check</h1><ul>${tasks.map((t) => `<li><strong>${esc(t.when)}:</strong> ${esc(t.task)}</li>`).join("")}</ul><p style="font-size:13px;color:${C.muted}">You asked for these reminders. Change or turn them off any time on the Reminders page.</p>${button(planUrl, "Open my plan")}`;
  return { subject, html: shell("Time for a quick check", body, meta), text: `${tasks.map((t) => `- ${t.when}: ${t.task}`).join("\n")}\n\n${planUrl}\n\n${meta.mailingAddress}\nUnsubscribe: ${meta.unsubscribeUrl}` };
}
````

### `lib/reminders.ts`

````ts
import type { ReminderPrefs } from "@/lib/accountData";
import type { MaintenanceItem } from "@/lib/plan/maintenance";

/**
 * D12 (accounts track): which maintenance reminders are due today. Opt-in only (prefs.enabled), per item
 * on/off and frequency. Schedules count from the plan's creation date (the same start the calendar uses).
 * - "When it's due": monthly items on the same day each month; 6-/12-month items every 6/12 months on
 *   that day; seasonal items on the 1st of their month.
 * - "Monthly" / "Every 3 months": that interval, on the same day of the month.
 */
const day = (d: Date) => Math.min(d.getUTCDate(), 28);
const monthsBetween = (a: Date, b: Date) => (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());

export function dueReminders(items: MaintenanceItem[], prefs: ReminderPrefs, start: Date, now: Date): MaintenanceItem[] {
  if (!prefs.enabled) return [];
  const months = monthsBetween(start, now);
  const sameDay = day(now) === day(start) && now.getUTCDate() <= 28;
  return items.filter((it) => {
    const p = prefs.types[it.id] ?? { on: true, every: "as_scheduled" as const };
    if (!p.on || months < 0) return false;
    if (p.every === "monthly") return sameDay && months >= 1;
    if (p.every === "quarterly") return sameDay && months >= 3 && months % 3 === 0;
    const r = it.repeat;
    if ("month" in r) return now.getUTCMonth() + 1 === r.month && now.getUTCDate() === 1;
    const every = r.every === "month" ? 1 : r.every === "6 months" ? 6 : 12;
    return sameDay && months >= every && months % every === 0;
  });
}
````

## Every code path that reads places or addresses

`git grep -nE "places|getPlaces|setPlaces|PlacesSchema|address" -- lib app components` (the ZIP table is excluded). Lines over 240 characters are cut.

````text
app/about/page.tsx:13:      <p>The questions ask for your ZIP code, never your street address, and never a diagnosis. Your answers are encrypted. An email is optional.</p>
app/account/places/page.tsx:9:export const metadata: Metadata = { title: "My places", robots: { index: false } };
app/account/places/page.tsx:16:      <h1 className="text-2xl font-bold no-print">My places</h1>
app/account/places/page.tsx:18:      <p className="text-muted no-print">Where you&apos;d go if you had to leave home. Saved to your account and encrypted. We never use these addresses in emails, analytics or AI.</p>
app/account/places/page.tsx:19:      <PlacesEditor initial={await store.getPlaces(user.id)} />
app/api/account/export/route.ts:9:  const [questionnaires, plans, emailEvents, places, reminderPrefs] = await Promise.all([
app/api/account/export/route.ts:13:    store.getPlaces(auth.user.id),
app/api/account/export/route.ts:16:  // Everything: plans include their inventory (decrypted), plus My places and reminder preferences.
app/api/account/export/route.ts:17:  const data = { exportedAt: new Date().toISOString(), user: auth.user, questionnaires, plans, emailEvents, places, reminderPrefs };
app/api/account/places/route.ts:1:import { PlacesSchema } from "@/lib/accountData";
app/api/account/places/route.ts:6:/** D4 My places (accounts track): a confirmed account's backup destinations, encrypted. Never used in emails, analytics or AI. */
app/api/account/places/route.ts:11:  return json({ places: await store.getPlaces(auth.user.id) });
app/api/account/places/route.ts:19:  const body = await readJson<{ places?: unknown }>(req, 20_000);
app/api/account/places/route.ts:20:  const parsed = PlacesSchema.safeParse(body?.places);
app/api/account/places/route.ts:21:  if (!parsed.success) return err("Check the places and try again");
app/api/account/places/route.ts:22:  await store.setPlaces(auth.user.id, parsed.data);
app/api/auth/resend/route.ts:6:/** "Didn't get it? Resend" on the plan page. Only for the signed-in (draft) user's own address. */
app/api/auth/verify/route.ts:8:/** Magic-link landing: confirms the address (double opt-in) and upgrades to a full session. */
app/api/plans/[id]/claim/route.ts:23: * (address already confirmed) or sends the double opt-in link (the plan follows on confirm).
app/api/plans/[id]/claim/route.ts:32:  if (!body.success) return err("Enter a valid email address.");
app/api/plans/[id]/claim/route.ts:54:  if (!(await limit(`mail:${user.id}`, LIMITS.loginPerEmailHour, 3600))) return err("We've sent a few emails to that address already. Check your inbox and spam folder.", 429);
app/api/questionnaire/[id]/generate/route.ts:35:  // Confirmed addresses get the plan right away, even if they confirmed on another device.
app/plan/[id]/places/page.tsx:10:/** D4 (launch): a printable backup-destination page. The address is typed and printed here, never saved or sent. */
app/privacy/page.tsx:13:        <li>Your email address, if you choose to give it, and when you consented and confirmed it.</li>
app/privacy/page.tsx:15:        <li>Your questionnaire answers: ZIP code, household size and ages, pets, home features, and yes/no answers about prescriptions and powered medical devices. We never ask for diagnoses, street addresses or ID n …
app/privacy/page.tsx:20:      <p>Answers and plans are encrypted in our database with AES-256-GCM, on top of our provider&apos;s encryption at rest. Answers never appear in web addresses. Only our servers can read the database.</p>
app/privacy/page.tsx:26:      <p>Write to the mailing address in the footer of any {BRAND.name} email.</p>
components/CopyForAI.tsx:7: * allow-list (no health details, consent records or addresses). `track` counts the click for the admin
components/EmailMyPlan.tsx:14: * `onSubmit` replaces the server call in the standalone demo.
components/EmailMyPlan.tsx:31:    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError("Enter a valid email address.");
components/PlacesEditor.tsx:6: * D4 My places (accounts track): backup destinations saved to a confirmed account, encrypted.
components/PlacesEditor.tsx:11:  const [places, setPlaces] = useState<Place[]>(initial.length ? initial : [{ id: "p1", name: "", address: "" }]);
components/PlacesEditor.tsx:13:  const update = (i: number, patch: Partial<Place>) => setPlaces((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
components/PlacesEditor.tsx:16:    const clean = places.filter((p) => p.name.trim() && p.address.trim());
components/PlacesEditor.tsx:17:    const r = await fetch("/api/account/places", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: clean }) }).catch(() => null);
components/PlacesEditor.tsx:21:    <div className="space-y-4" data-testid="places-editor">
components/PlacesEditor.tsx:22:      {places.map((p, i) => {
components/PlacesEditor.tsx:23:        const q = encodeURIComponent(p.address.trim());
components/PlacesEditor.tsx:28:            <label className="block no-print"><span className="text-sm font-semibold">Address</span><input className="input mt-1 w-full" value={p.address} onChange={(e) => update(i, { address: e.target.value } …
components/PlacesEditor.tsx:31:            {p.address.trim() && (
components/PlacesEditor.tsx:39:              <p className="text-2xl">{p.address}</p>
components/PlacesEditor.tsx:46:        {places.length < 10 && <button type="button" className="btn-ghost border border-line text-sm px-3 min-h-[44px]" onClick={() => setPlaces((ps) => [...ps, { id: `p${Date.now().toString(36)}`, name: "", a …
components/PlacesEditor.tsx:47:        <button type="button" className="btn text-sm px-4 min-h-[44px]" onClick={save} disabled={state === "saving"}>Save my places</button>
components/PlacesEditor.tsx:50:      <p role="status" className="text-sm text-muted no-print">{state === "saved" ? "Saved to your account." : state === "error" ? "Couldn't save. Check the address and try again." : ""}</p>
components/PlacesForm.tsx:8: * when tapped. No embedded map. The address is never used in emails, analytics or AI.
components/PlacesForm.tsx:12:  const [address, setAddress] = useState("");
components/PlacesForm.tsx:14:  const q = encodeURIComponent(address.trim());
components/PlacesForm.tsx:17:      <div className="no-print space-y-3" data-testid="places-form">
components/PlacesForm.tsx:24:          <input className="input mt-1 w-full" autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} />
components/PlacesForm.tsx:32:          <button type="button" className="btn text-sm px-4 min-h-[44px]" onClick={() => window.print()} disabled={!address.trim()}>Print</button>
components/PlacesForm.tsx:33:          {address.trim() && (
components/PlacesForm.tsx:42:      <section className="hidden print:block" data-testid="places-print">
components/PlacesForm.tsx:45:        <p className="mt-2 text-2xl">{address}</p>
components/PlanView.tsx:258:                    <p className="mt-3 no-print"><a href={`/plan/${planId}/places`} className="btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center">Add your backup destination (printab …
components/PlanView.tsx:261:                    // The dashboard's shopping list replaces the compact shopping list inside the Priority list on the web
components/Questionnaire.tsx:127:          <p className="text-sm text-muted">Used for your climate and local hazards. We never ask for your street address.</p>
components/Questionnaire.tsx:461:/** `onGenerate` replaces the server round-trip (standalone demo build): the caller builds the plan. */
components/StartButton.tsx:1:/** Plain form POST: starts a plan with no email and no JavaScript required. `onStart` replaces it in the demo. */
lib/accountData.ts:6: * - My places (D4): per account, name + address of backup destinations. Stored encrypted; never used in
lib/accountData.ts:41:  address: z.string().trim().min(3).max(200),
lib/accountData.ts:46:export const PlacesSchema = z.array(PlaceSchema).max(10);
lib/calendar/ics.ts:7: * No links, no health details, no addresses: just the task text.
lib/catalog/types.ts:64:  /** Item ids that no longer apply when this item is chosen (e.g. a standby generator replaces gas cans). */
lib/copy.ts:9:/** D4 at launch: the address is never saved anywhere, so this is the one place that says "isn't saved". */
lib/copy.ts:10:export const PLACES_NOT_SAVED = "This address isn't saved. Confirm your email to save your places and use them on any device.";
lib/email/render.ts:8: * CAN-SPAM footer (physical address + one-click unsubscribe) via `footer()`.
lib/email/render.ts:183:/** Sent once, a day after signup, if the address was never confirmed but a plan exists. */
lib/email/render.ts:208:/** D12 (accounts track): opt-in maintenance reminder. Task text only: no links to stores, no health details, no addresses. */
lib/email/typos.ts:16:/** Returns a corrected address, or null if the domain looks fine. */
lib/flags.ts:5: * - ACCOUNTS_ENABLED: the accounts track (My plans, inventory, My places, reminders, dashboard tabs).
lib/menu.ts:20:  { label: "My places", href: "/account/places" },
lib/plan/aiSummary.ts:11: * addresses are never read. Any line that mentions a health topic is dropped as a second guard.
lib/plan/aiSummary.ts:23:  "Copies a summary of your plan to paste into ChatGPT, Claude or Gemini, so it can set reminders and answer questions. Health details and addresses aren't included.";
lib/plan/build.ts:139:      return { id: "month-destination", text: "Choose a backup destination outside your area, and write down its address and how to get there.", link: HOWTO.evacuation };
lib/plan/build.ts:977:          ...(cp.evacuation ? [["Fallback location", `${LABELS.fallback[cp.evacuation.locationType]} (~${n(cp.evacuation.distanceMiles)} mi): address on paper in each go-bag`]] : []),
lib/plan/build.ts:1060:  const destinationTodo: Step = { id: "evac-destination", text: "Add your backup destination: name, address and how to get there, printed for each go-bag.", link: HOWTO.evacuation };
lib/server/plans.ts:47:/** Email the plan (HTML + PDF). Only to confirmed (double opt-in) addresses. */
lib/server/ratelimit.ts:11:  // Generous per IP: mobile carriers put many phones behind one address (CGNAT). Turnstile stops bots; per-email limits stop abuse.
lib/server/session.ts:9: *  - "draft": created at email signup before the address is confirmed. Can only see
lib/server/store/file.ts:18:/** Same columns as migrations 0007 (places_json, encrypted) and 0008 (reminder_prefs). */
lib/server/store/file.ts:19:type StoredU = UserRow & { places_json?: Sealed | null; reminder_prefs?: ReminderPrefs | null };
lib/server/store/file.ts:76:/** Users leave the store without their sealed columns (places and prefs have their own methods). */
lib/server/store/file.ts:79:  const { places_json: _p, reminder_prefs: _r, ...rest } = u;
lib/server/store/file.ts:172:  async getPlaces(userId) {
lib/server/store/file.ts:174:    return u?.places_json ? unseal<Place[]>(u.places_json) : [];
lib/server/store/file.ts:176:  async setPlaces(userId, places) {
lib/server/store/file.ts:179:      if (u) u.places_json = places.length ? seal(places) : null;
lib/server/store/supabase.ts:27:/** Users are read without their sealed columns (places_json, migration 0007; reminder_prefs, 0008). */
lib/server/store/supabase.ts:104:  async getPlaces(userId) {
lib/server/store/supabase.ts:105:    const r = must(await db().from("users").select("places_json").eq("id", userId).maybeSingle()) as { places_json: Sealed | null } | null;
lib/server/store/supabase.ts:106:    return r?.places_json ? unseal<Place[]>(r.places_json) : [];
lib/server/store/supabase.ts:108:  async setPlaces(userId, places) {
lib/server/store/supabase.ts:109:    must(await db().from("users").update({ places_json: places.length ? seal(places) : null }).eq("id", userId));
lib/server/store/types.ts:109:  /** D4 (accounts track): My places, encrypted per user. */
lib/server/store/types.ts:110:  getPlaces(userId: string): Promise<Place[]>;
lib/server/store/types.ts:111:  setPlaces(userId: string, places: Place[]): Promise<void>;
````

## Every code path that reads health answers (prescriptions, powered devices, mobility)

`git grep -nE "hasPrescriptions|poweredDevices|elderlyOrMobility|POWERED|mobility" -- lib app components`. Lines over 240 characters are cut.

````text
app/privacy/page.tsx:16:        <li>If you answer yes to the prescription, powered medical device or mobility questions, we ask for your consent first. Those answers are used only to build your plan. They are encrypted and never sold, share …
components/Questionnaire.tsx:101:      I agree that {BRAND.name} can use my medical and mobility answers to build my plan. They&apos;re encrypted, never sold and never used for marketing emails.
components/Questionnaire.tsx:171:        <Group label="Is anyone elderly or has limited mobility?">
components/Questionnaire.tsx:172:          <YesNo value={a.elderlyOrMobility} onChange={(elderlyOrMobility) => set({ elderlyOrMobility })} />
components/Questionnaire.tsx:244:          <YesNo value={a.hasPrescriptions} onChange={(hasPrescriptions) => set({ hasPrescriptions })} />
components/Questionnaire.tsx:249:              <Choice key={d} selected={a.poweredDevices.includes(d)} onClick={() => set({ poweredDevices: toggle(a.poweredDevices, d) })}>{LABELS.device[d]}</Choice>
components/Questionnaire.tsx:251:            <Choice selected={a.poweredDevices.length === 0} onClick={() => set({ poweredDevices: [] })}>None</Choice>
lib/answers/schema.ts:53:    elderlyOrMobility: z.boolean(),
lib/answers/schema.ts:56:    hasPrescriptions: z.boolean(),
lib/answers/schema.ts:57:    poweredDevices: z.array(PoweredDevice).max(4),
lib/answers/schema.ts:109:  elderlyOrMobility: false,
lib/answers/schema.ts:112:  hasPrescriptions: false,
lib/answers/schema.ts:113:  poweredDevices: [],
lib/catalog/seed.ts:173:    id: "mobility-kit", category: "Accessibility", name: "Mobility & access kit",
lib/catalog/seed.ts:176:    qty: 1, tags: ["mobility"],
lib/catalog/types.ts:19:  "mobility",
lib/legal.ts:21:type HealthAnswers = { hasPrescriptions?: boolean; poweredDevices?: unknown[]; elderlyOrMobility?: boolean };
lib/legal.ts:23:/** True when any answer reveals something about someone's health (prescriptions, powered devices, mobility). */
lib/legal.ts:25:  return !!a.hasPrescriptions || !!a.elderlyOrMobility || (Array.isArray(a.poweredDevices) && a.poweredDevices.length > 0);
lib/legal.ts:30:  "Please tick the box to let us use your medical and mobility answers to build your plan (or change those answers to No).";
lib/legal.ts:36:    a.hasPrescriptions && "daily prescriptions",
lib/legal.ts:37:    Array.isArray(a.poweredDevices) && a.poweredDevices.length > 0 && "a powered medical device",
lib/legal.ts:38:    a.elderlyOrMobility && "limited mobility (on the Household screen)",
lib/plan/aiSummary.ts:27:export const HEALTH_WORDS = /\b(cpap|bipap|oxygen|nebuli[sz]er|medic(al|ation|ine)s?|prescri\w*|pharmac\w*|insulin|dialysis|mobility|wheelchair|powered device|health|diagnos\w*|dose|dosing|dosage)\b/i;
lib/plan/build.ts:273:          ["People", `${plural(h.adults, "adult")}, ${kidsText}${h.elderlyOrMobility ? "; someone elderly or with limited mobility" : ""}`],
lib/plan/build.ts:328:  if (h.elderlyOrMobility)
lib/plan/build.ts:329:    week.push("Register anyone with mobility or medical needs with your county's special-needs (access & functional needs) registry or shelter program, and arrange who will help them evacuate.");
lib/plan/build.ts:362:  if (a.hasPrescriptions) week.push("Ask your pharmacist or doctor how to keep an extra supply of daily prescriptions on hand.");
lib/plan/build.ts:426:  if (a.poweredDevices.length) practice.push("Medical device: switch it to battery power and time how long the battery lasts.");
lib/plan/build.ts:755:  if (a.poweredDevices.length)
lib/plan/build.ts:760:      text: `Your ${a.poweredDevices.map((d) => LABELS.device[d]).join(", ")} needs battery backup that covers at least 2 nights. Ask the device provider which batteries are approved, ask your utility about its medical …
lib/plan/build.ts:943:    facts: [...(a.hasPrescriptions ? ["Someone takes daily prescriptions"] : []), ...(a.skills.includes("first_aid") ? ["Someone has first aid training"] : ["No one has first aid training yet"])],
lib/plan/build.ts:948:        ...(a.hasPrescriptions ? ["Ask your pharmacist about early refills or a 90-day supply; many states allow emergency refills during declared disasters."] : []),
lib/plan/build.ts:949:        ...(a.hasPrescriptions ? ["Learn which medications need refrigeration and keep a small cooler and ice packs for them."] : []),
lib/plan/build.ts:1100:            ...(h.elderlyOrMobility ? [{ if: "A voluntary evacuation is announced", then: "Leave now with anyone who has mobility or medical needs — they need extra time." }] : []),
lib/plan/build.ts:1145:            ...(h.elderlyOrMobility ? [{ if: "A voluntary evacuation is announced", then: "Leave now with anyone who has mobility or medical needs — they need extra time." }] : []),
lib/plan/help.ts:46:  [/special-needs|access & functional needs/i, () => ({ buy: ["mobility-kit"], link: HOWTO.olderAdults })],
lib/plan/sample.ts:11:  elderlyOrMobility: false,
lib/plan/sample.ts:14:  hasPrescriptions: false,
lib/plan/sample.ts:15:  poweredDevices: [],
lib/rules/engine.ts:21:  elderlyOrMobility: boolean;
lib/rules/engine.ts:42:    elderlyOrMobility: a.elderlyOrMobility,
lib/rules/engine.ts:460:  if (h.elderlyOrMobility) t.add("mobility");
lib/rules/engine.ts:461:  if (a.poweredDevices.length) t.add("medical_device");
lib/rules/engine.ts:797:    medicalDevicePriority: a.poweredDevices.length > 0,
````

## The LLM writer's input

The writer gets section ids, titles, template summaries, allowed tokens and short facts. Its household context:

`lib/llm/writer.ts:70-83` (householdContext)

````ts
function householdContext(cp: ComputedPlan): string[] {
  const a = cp.answers;
  const out = [
    `Home type: ${a.homeType}`,
    `Region: ${cp.profile.region}`,
    `Heat: ${a.heatSources.join(", ")}`,
    `Backup power: ${a.backupPower}`,
    `Has children: ${cp.household.children > 0 ? "yes" : "no"}`,
    `Has pets: ${a.pets.length > 0 ? "yes" : "no"}`,
    `Winter risk: ${cp.profile.winter}; hurricane risk: ${cp.profile.hurricane}; flood risk: ${cp.profile.flood}`,
  ];
  if (cp.evacuation) out.push(`Fallback location type: ${cp.evacuation.locationType}`);
  return out;
}
````

## Events / analytics

The app has no third-party analytics. Events go to `email_events` via `store.addEmailEvent`. Every call site:

````text
app/api/plans/[id]/ai-copy/route.ts:14:  await store.addEmailEvent({ user_id: plan.user_id, type: AI_COPY_EVENT, provider_id: plan.id, sent_at: new Date().toISOString() });
app/api/unsubscribe/route.ts:16:    await store.addEmailEvent({ user_id: u, type: "unsubscribed", provider_id: null, sent_at: new Date().toISOString() });
app/api/webhooks/resend/route.ts:26:  if (type) await store.addEmailEvent({ user_id: null, type, provider_id: evt.data?.email_id ?? null, sent_at: new Date().toISOString() });
app/go/[itemId]/route.ts:26:  await store.addEmailEvent({ user_id: session?.uid || null, type: "affiliate_click", provider_id: itemId, sent_at: new Date().toISOString() }).catch(() => {});
lib/server/mailer.ts:62:  await store.addEmailEvent({ user_id: m.userId, type: `sent:${m.type}`, provider_id: providerId, sent_at: new Date().toISOString() });
lib/server/store/file.ts:232:  async addEmailEvent(e) {
lib/server/store/supabase.ts:150:  async addEmailEvent(e) {
lib/server/store/types.ts:128:  addEmailEvent(e: Omit<EmailEventRow, "id">): Promise<void>;
````

## Tests that prove they don't leak

### `tests/places.test.ts`

````ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { aiSummary } from "@/lib/plan/aiSummary";
import { renderPlanEmail } from "@/lib/email/render";
import { buildPlan } from "./helpers/build";

/** D4 (launch): the backup-destination address is typed and printed in the browser only. */
describe("My places at launch: nothing saved or sent", () => {
  const src = readFileSync("components/PlacesForm.tsx", "utf8");
  it("the form can't send anything: no form element, no field names, no network calls, no storage", () => {
    expect(src).not.toMatch(/<form\b/);
    expect(src).not.toMatch(/\sname=/);
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/);
  });
  it("says the address isn't saved, and links directions only on tap (no embedded map)", () => {
    expect(src).toContain("PLACES_NOT_SAVED");
    expect(src).not.toMatch(/<iframe|maps\.googleapis|maps\/embed/i);
  });
  it("plans, emails and Copy for AI have no place to put an address", async () => {
    const r = await buildPlan();
    const all = [JSON.stringify(r.document), renderPlanEmail(r.document, { appUrl: "x", unsubscribeUrl: "x", mailingAddress: "x", planUrl: "x", pdfAttached: true }).html, aiSummary(r.document, r.computed.answers)];
    for (const t of all) expect(t).not.toMatch(/"(address|place|places)"\s*:/);
  });
});
````

### `tests/aiSummary.test.ts`

````ts
import { describe, expect, it } from "vitest";
import { AI_GROUND_RULES, aiSummary, HEALTH_WORDS } from "@/lib/plan/aiSummary";
import { lintText } from "@/lib/safety/linter";
import { BRAND } from "@/lib/brand";
import { at } from "./fixtures/households";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan, SAMPLE_HOUSEHOLD } from "./helpers/build";
import type { Answers } from "@/lib/answers/schema";

/** Households with every health answer switched on: none of it may reach the copied text. */
function healthHeavy(): Answers[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
  const zips = ["11746", "10025", "33101", "70112", "94110", "05602", "99501", "00000"];
  return Array.from({ length: 40 }, (_, i) =>
    at({
      zip: zips[i % zips.length],
      scenarioDays: ([3, 14, 30, 90] as const)[i % 4],
      adults: 1 + (i % 3),
      childrenAges: rnd() < 0.5 ? [1, 7] : [],
      elderlyOrMobility: true,
      hasPrescriptions: true,
      poweredDevices: (["cpap", "oxygen", "nebulizer", "other"] as const).filter(() => rnd() < 0.7),
      pets: rnd() < 0.5 ? [{ type: "dog", count: 1, size: "large", specialDiet: true, medications: true }] : [],
      backupPower: (["none", "portable_generator", "solar_battery"] as const)[i % 3],
    }),
  );
}

describe("Copy for your AI assistant (D12b)", () => {
  it("never includes health answers, consent records, the ZIP or an address", async () => {
    const households = [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a), ...healthHeavy()];
    for (const a of households) {
      const r = await buildPlan(a);
      const t = aiSummary(r.document, r.computed.answers);
      const withoutRules = t.split("\n").filter((l) => !AI_GROUND_RULES.some((g) => l.includes(g))).join("\n");
      expect(withoutRules, a.zip).not.toMatch(HEALTH_WORDS);
      expect(t).not.toMatch(/consent|terms_version|TERMS_VERSION|agreed/i);
      expect(t).not.toContain(a.zip);
      expect(t).not.toMatch(/\b\d{5}\b/); // no ZIP-like number
      expect(t).not.toMatch(/\b(street|st\.|avenue|ave\.|road|rd\.|address)\b/i);
      expect(t).not.toMatch(/https?:\/\//); // no links at all, so never an Amazon link
    }
  });

  it("states the five ground rules word for word, with the brand from lib/brand.ts", async () => {
    const r = await buildPlan();
    const t = aiSummary(r.document, r.computed.answers);
    for (const g of AI_GROUND_RULES) expect(t).toContain(g);
    expect(t).toContain(`This plan's numbers come from ${BRAND.name}; your assistant's advice is its own.`);
    expect(t).toContain("Set reminders for the dates in the maintenance schedule.");
    expect(t).toContain("Help me with my first 3 steps.");
  });

  it("uses the plan's own amounts and schedule, unchanged", async () => {
    const r = await buildPlan();
    const t = aiSummary(r.document, r.computed.answers);
    for (const s of r.document.overview!.stats) expect(t).toContain(`${s.label}: ${s.value} (${s.math})`);
    const maint = r.document.sections.find((s) => s.id === "maintenance")!.blocks[0];
    if (maint.type !== "table") throw new Error("maintenance table");
    for (const row of maint.rows) if (!HEALTH_WORDS.test(row[1])) expect(t).toContain(`${row[0]}: ${row[1]}`);
    expect(t).toContain("Every 12 months: Rotate stabilized gasoline into cars; replace bleach; check first aid kit; update documents, photos.");
    expect(t).toMatch(/2 adults, 2 children, 1 pet/);
    expect(t).toMatch(/Planning for: 90 days/);
  });

  it("passes the safety linter", async () => {
    for (const a of [SAMPLE_HOUSEHOLD, ...PERSONAS.map((p) => p.a)]) {
      const r = await buildPlan(a);
      expect(lintText(aiSummary(r.document, r.computed.answers))).toEqual([]);
    }
  });
});
````

Other test lines on health, address or marketing data:

````text
tests/accounts.test.ts:25:    expect(PlacesSchema.safeParse([{ id: "p1", name: "Aunt", address: "1 Main St", distanceMiles: 40 }]).success).toBe(true);
tests/accounts.test.ts:26:    expect(PlacesSchema.safeParse(Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, name: "x", address: "1 Main" }))).success).toBe(false);
tests/authz.test.ts:51:  await store.setPlaces(a.id, [{ id: "p1", name: "Aunt", address: "742 Sentinel Road" }]);
tests/authz.test.ts:103:    expect(await (await call("places", "GET", "/x")).json()).toEqual({ places: [{ id: "p1", name: "Aunt", address: "742 Sentinel Road" }] });
tests/email.test.ts:21:      poweredDevices: ["cpap", "oxygen"],
tests/email.test.ts:22:      hasPrescriptions: true,
tests/email.test.ts:37:  it("every email has the mailing address and an unsubscribe link (CAN-SPAM)", async () => {
tests/fixtures/personas.ts:9:  { name: "Ray & June", who: "Retired couple, Florida, oxygen concentrator", a: at({ zip: "33908", scenarioDays: 14, adults: 2, elderlyOrMobility: true, poweredDevices: ["oxygen"], hasPrescriptions: true, homeTy …
tests/fixtures/personas.ts:14:  { name: "The Olsons", who: "Minnesota farm, propane heat, elderly parent", a: at({ zip: "56701", scenarioDays: 30, adults: 4, elderlyOrMobility: true, hasPrescriptions: true, heatSources: ["propane"], cooking …
tests/legal.test.ts:6:const none = { hasPrescriptions: false, poweredDevices: [], elderlyOrMobility: false };
tests/legal.test.ts:11:    expect(needsHealthConsent({ ...none, hasPrescriptions: true })).toBe(true);
tests/legal.test.ts:12:    expect(needsHealthConsent({ ...none, poweredDevices: ["cpap"] })).toBe(true);
tests/legal.test.ts:13:    expect(needsHealthConsent({ ...none, elderlyOrMobility: true })).toBe(true);
tests/legal.test.ts:21:    const a = { ...none, poweredDevices: ["oxygen"] };
tests/legal.test.ts:28:    expect(consentRecord({ ...none, hasPrescriptions: true }, now).healthDataConsentAt).toBe(now.toISOString());
tests/legal.test.ts:45:  const none = { hasPrescriptions: false, poweredDevices: [], elderlyOrMobility: false };
tests/legal.test.ts:54:    expect(consentStillValid({ ...none, hasPrescriptions: true }, consentRecord(none, now))).toBe(false);
tests/legal.test.ts:55:    expect(consentStillValid({ ...none, hasPrescriptions: true }, consentRecord({ ...none, hasPrescriptions: true }, now))).toBe(true);
tests/legal.test.ts:60:  const none = { hasPrescriptions: false, poweredDevices: [], elderlyOrMobility: false };
tests/legal.test.ts:62:    expect(healthConsentMessage({ ...none, elderlyOrMobility: true })).toMatch(/limited mobility \(on the Household screen\).*that answer to No/);
tests/legal.test.ts:65:    expect(healthConsentMessage({ ...none, hasPrescriptions: true, poweredDevices: ["cpap"] })).toMatch(/daily prescriptions and a powered medical device.*those answers/);
tests/migrate.test.ts:7:  version: 1, zip: "11746", scenarioDays: 90, adults: 2, childrenAges: [2, 4], elderlyOrMobility: false, toddlerNeeds: ["diapers"],
tests/migrate.test.ts:8:  pets: [{ type: "dog", count: 1, size: "medium", specialDiet: false, medications: false }], hasPrescriptions: false, poweredDevices: [],
tests/pathways.test.ts:35:  ["more adults", { adults: 4 }], ["a child", { childrenAges: [8] }], ["elderly/mobility", { elderlyOrMobility: true }],
tests/pathways.test.ts:42:  ["prescriptions", { hasPrescriptions: true }], ["CPAP", { poweredDevices: ["cpap"] }], ["oxygen", { poweredDevices: ["oxygen"] }], ["nebulizer", { poweredDevices: ["nebulizer"] }],
tests/pathways.test.ts:98:  { key: "people", values: [{ adults: 1, childrenAges: [] }, { adults: 2, childrenAges: [0], toddlerNeeds: ["formula", "diapers"] }, { adults: 2, childrenAges: [2, 7], toddlerNeeds: ["diapers"] }, { adults: 4, chil …
tests/pathways.test.ts:100:  { key: "medical", values: [{ hasPrescriptions: false, poweredDevices: [] }, { hasPrescriptions: true, poweredDevices: [] }, { hasPrescriptions: true, poweredDevices: ["oxygen"] }] },
tests/pathways.test.ts:158:      if (a.poweredDevices.length) expect(picked(r, "med-battery"), why).toBe(true);
tests/rules.test.ts:204:    const m = computePlan(at({ waterSource: "well", poweredDevices: ["cpap"], budget: "under_500" }), C, SEED_CATALOG, new Date("2026-11-18"));
tests/safety.test.ts:60:    const d = (await gen(at({ hasPrescriptions: true, pets: [{ type: "dog", count: 1, size: "large", specialDiet: true, medications: true }] }))).document;
tests/safety.test.ts:67:    const r = await gen(at({ poweredDevices: ["oxygen"], budget: "under_500" }));
tests/safety.test.ts:107:        elderlyOrMobility: rnd() < 0.3,
tests/safety.test.ts:110:        hasPrescriptions: rnd() < 0.5,
tests/safety.test.ts:111:        poweredDevices: some(["cpap", "oxygen", "nebulizer"] as const),
````
