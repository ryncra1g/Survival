"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnswersSchema, DEFAULT_ANSWERS, LABELS, type Answers, type PetGroupT } from "@/lib/answers/schema";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { computeFood, computeWater, household } from "@/lib/rules/engine";
import { checkConsent, HEALTH_REQUIRED_MSG, needsHealthConsent } from "@/lib/legal";
import { BRAND } from "@/lib/brand";

type Draft = Answers & { _step?: number; _screen?: string; _terms?: boolean; _health?: boolean };

/* ---------- small building blocks ---------- */
function Choice({ selected, onClick, children, sub }: { selected: boolean; onClick: () => void; children: React.ReactNode; sub?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full min-h-[52px] text-left px-4 py-3 rounded-xl border-2 transition-colors ${selected ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
    >
      <span className="font-semibold">{children}</span>
      {sub && <span className="block text-sm text-muted">{sub}</span>}
    </button>
  );
}
function Group({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold mb-2">{label}</legend>
      {hint && <p className="text-sm text-muted -mt-1 mb-2">{hint}</p>}
      {children}
    </fieldset>
  );
}
function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 }) {
  return <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>{children}</div>;
}
function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="btn-ghost w-12 text-xl" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <span className="text-2xl font-bold w-10 text-center" aria-live="polite">{value}</span>
      <button type="button" className="btn-ghost w-12 text-xl" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}
function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Grid>
      <Choice selected={value} onClick={() => onChange(true)}>Yes</Choice>
      <Choice selected={!value} onClick={() => onChange(false)}>No</Choice>
    </Grid>
  );
}
const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/* ---------- screens ---------- */
function ConsentBox({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

function HealthConsent({ a, set }: { a: Draft; set: (patch: Partial<Draft>) => void }) {
  return (
    <ConsentBox id="healthConsent" checked={!!a._health} onChange={(_health) => set({ _health })}>
      I agree that {BRAND.name} can use my medical and mobility answers to build my plan. They&apos;re encrypted, never sold and never used for marketing emails.
    </ConsentBox>
  );
}

interface ScreenProps {
  a: Draft;
  set: (patch: Partial<Draft>) => void;
}
interface Screen {
  id: string;
  title: string;
  show?: (a: Draft) => boolean;
  valid?: (a: Draft) => string | null;
  render: (p: ScreenProps) => React.ReactNode;
}

const SCREENS: Screen[] = [
  {
    id: "location",
    title: "Where is home, and how long should you plan for?",
    valid: (a) => (/^\d{5}$/.test(a.zip) ? null : "Enter a 5-digit ZIP code."),
    render: ({ a, set }) => (
      <>
        <div>
          <label htmlFor="zip" className="font-semibold">ZIP code</label>
          <p className="text-sm text-muted">Used for your climate and local hazards. We never ask for your street address.</p>
          <input id="zip" className="input mt-2 text-lg tracking-widest max-w-[10rem]" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={a.zip} onChange={(e) => set({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
        </div>
        <Group label="Plan for an outage or disruption lasting…">
          <Grid>
            {([3, 14, 30, 90] as const).map((d) => (
              <Choice key={d} selected={a.scenarioDays === d} onClick={() => set({ scenarioDays: d })} sub={{ 3: "Basic kit", 14: "FEMA recommended", 30: "Serious storm", 90: "Long disruption" }[d]}>
                {LABELS.scenarioDays[d]}
              </Choice>
            ))}
          </Grid>
        </Group>
      </>
    ),
  },
  {
    id: "household",
    title: "Who lives with you?",
    render: ({ a, set }) => (
      <>
        <Group label="Adults (18+)">
          <Stepper label="adults" value={a.adults} min={1} max={12} onChange={(adults) => set({ adults })} />
        </Group>
        <Group label="Children" hint="Add each child's age. Tap a child to remove.">
          <div className="flex flex-wrap gap-2">
            {a.childrenAges.map((age, i) => (
              <button key={i} type="button" className="btn-ghost" aria-label={`Remove child age ${age}`} onClick={() => set({ childrenAges: a.childrenAges.filter((_, j) => j !== i) })}>
                Age {age} ✕
              </button>
            ))}
          </div>
          {a.childrenAges.length < 10 && (
            <div className="flex gap-2 items-center">
              <label htmlFor="childAge" className="sr-only">Add a child age</label>
              <select id="childAge" className="input max-w-[12rem]" value="" onChange={(e) => e.target.value !== "" && set({ childrenAges: [...a.childrenAges, Number(e.target.value)] })}>
                <option value="">+ Add a child…</option>
                {Array.from({ length: 18 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? "Under 1" : `Age ${i}`}</option>
                ))}
              </select>
            </div>
          )}
        </Group>
        <Group label="Is anyone elderly or has limited mobility?">
          <YesNo value={a.elderlyOrMobility} onChange={(elderlyOrMobility) => set({ elderlyOrMobility })} />
        </Group>
      </>
    ),
  },
  {
    id: "toddlers",
    title: "What do your little ones need?",
    show: (a) => a.childrenAges.some((x) => x <= 3),
    render: ({ a, set }) => (
      <Group label="Select all that apply">
        <Grid cols={1}>
          <Choice selected={a.toddlerNeeds.includes("diapers")} onClick={() => set({ toddlerNeeds: toggle(a.toddlerNeeds, "diapers") })}>Diapers</Choice>
          <Choice selected={a.toddlerNeeds.includes("formula")} onClick={() => set({ toddlerNeeds: toggle(a.toddlerNeeds, "formula") })}>Infant formula</Choice>
          <Choice selected={a.toddlerNeeds.includes("milk")} onClick={() => set({ toddlerNeeds: toggle(a.toddlerNeeds, "milk") })}>Toddler milk</Choice>
          <Choice selected={a.toddlerNeeds.length === 0} onClick={() => set({ toddlerNeeds: [] })}>None of these</Choice>
        </Grid>
      </Group>
    ),
  },
  {
    id: "pets",
    title: "Any pets?",
    render: ({ a, set }) => {
      const update = (i: number, patch: Partial<PetGroupT>) => set({ pets: a.pets.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
      return (
        <>
          {a.pets.map((p, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-semibold">Pet group {i + 1}</p>
                <button type="button" className="text-sm underline text-danger" onClick={() => set({ pets: a.pets.filter((_, j) => j !== i) })}>Remove</button>
              </div>
              <Group label="Type">
                <div className="grid grid-cols-3 gap-2">
                  {(["dog", "cat", "other"] as const).map((t) => (
                    <Choice key={t} selected={p.type === t} onClick={() => update(i, { type: t })}>{t[0].toUpperCase() + t.slice(1)}</Choice>
                  ))}
                </div>
              </Group>
              <Group label="Size">
                <div className="grid grid-cols-3 gap-2">
                  {(["small", "medium", "large"] as const).map((s) => (
                    <Choice key={s} selected={p.size === s} onClick={() => update(i, { size: s })} sub={{ small: "< 20 lb", medium: "20–50 lb", large: "50+ lb" }[s]}>{s[0].toUpperCase() + s.slice(1)}</Choice>
                  ))}
                </div>
              </Group>
              <Group label="How many?">
                <Stepper label="pets" value={p.count} min={1} max={10} onChange={(count) => update(i, { count })} />
              </Group>
              <Group label="Special diet?"><YesNo value={p.specialDiet} onChange={(specialDiet) => update(i, { specialDiet })} /></Group>
              <Group label="Takes medication?"><YesNo value={p.medications} onChange={(medications) => update(i, { medications })} /></Group>
            </div>
          ))}
          <Grid>
            {a.pets.length < 6 && (
              <Choice selected={false} onClick={() => set({ pets: [...a.pets, { type: "dog", size: "medium", count: 1, specialDiet: false, medications: false }] })}>+ Add a pet</Choice>
            )}
            <Choice selected={a.pets.length === 0} onClick={() => set({ pets: [] })}>No pets</Choice>
          </Grid>
        </>
      );
    },
  },
  {
    id: "medical",
    title: "Medical needs",
    valid: (a) => (needsHealthConsent(a) && !a._health ? HEALTH_REQUIRED_MSG : null),
    render: ({ a, set }) => (
      <>
        <p className="text-sm text-muted">We don&apos;t ask about conditions or diagnoses — only what affects supplies and power.</p>
        <Group label="Does anyone take daily prescription medication?">
          <YesNo value={a.hasPrescriptions} onChange={(hasPrescriptions) => set({ hasPrescriptions })} />
        </Group>
        <Group label="Does anyone rely on a powered medical device?">
          <Grid cols={1}>
            {(["cpap", "oxygen", "nebulizer", "other"] as const).map((d) => (
              <Choice key={d} selected={a.poweredDevices.includes(d)} onClick={() => set({ poweredDevices: toggle(a.poweredDevices, d) })}>{LABELS.device[d]}</Choice>
            ))}
            <Choice selected={a.poweredDevices.length === 0} onClick={() => set({ poweredDevices: [] })}>None</Choice>
          </Grid>
        </Group>
        {needsHealthConsent(a) && <HealthConsent a={a} set={set} />}
      </>
    ),
  },
  {
    id: "home",
    title: "Tell us about your home",
    render: ({ a, set }) => (
      <>
        <Group label="Home type">
          <div className="grid grid-cols-3 gap-2">
            {(["house", "townhouse", "apartment"] as const).map((h) => (
              <Choice key={h} selected={a.homeType === h} onClick={() => set({ homeType: h })}>{LABELS.home[h]}</Choice>
            ))}
          </div>
        </Group>
        <Group label="Floors (not counting a basement)">
          <Stepper label="floors" value={a.floors} min={1} max={5} onChange={(floors) => set({ floors })} />
        </Group>
        <Group label="Your home has… (select all)">
          <div className="grid grid-cols-3 gap-2">
            <Choice selected={a.hasBasement} onClick={() => set({ hasBasement: !a.hasBasement })}>Basement / lower level</Choice>
            <Choice selected={a.hasGarage} onClick={() => set({ hasGarage: !a.hasGarage })}>Garage</Choice>
            <Choice selected={a.hasYard} onClick={() => set({ hasYard: !a.hasYard })}>Yard</Choice>
          </div>
        </Group>
      </>
    ),
  },
  {
    id: "heat",
    title: "Heat, cooking and water",
    valid: (a) => (a.heatSources.length ? null : "Pick at least one heat source."),
    render: ({ a, set }) => (
      <>
        <Group label="How is your home heated? (select all)">
          <Grid>
            {(["natural_gas", "oil", "propane", "electric", "wood"] as const).map((h) => (
              <Choice key={h} selected={a.heatSources.includes(h)} onClick={() => set({ heatSources: toggle(a.heatSources, h) })}>{LABELS.heat[h]}</Choice>
            ))}
          </Grid>
        </Group>
        <Group label="What's your stove?">
          <div className="grid grid-cols-3 gap-2">
            {(["gas", "electric", "induction"] as const).map((c) => (
              <Choice key={c} selected={a.cooking === c} onClick={() => set({ cooking: c })}>{LABELS.cooking[c]}</Choice>
            ))}
          </div>
        </Group>
        <Group label="Where does your water come from?">
          <Grid>
            <Choice selected={a.waterSource === "municipal"} onClick={() => set({ waterSource: "municipal" })} sub="Water bill / city or town">Public water</Choice>
            <Choice selected={a.waterSource === "well"} onClick={() => set({ waterSource: "well" })} sub="Pump needs electricity">Private well</Choice>
          </Grid>
        </Group>
        <Group label="Do you already have a water filter for emergencies?" hint="A gravity or hollow-fiber filter, not a fridge or pitcher filter.">
          <YesNo value={a.hasFiltration} onChange={(hasFiltration) => set({ hasFiltration })} />
        </Group>
      </>
    ),
  },
  {
    id: "power",
    title: "Power and vehicles",
    render: ({ a, set }) => (
      <>
        <Group label="Backup power today">
          <Grid>
            {(["none", "portable_generator", "standby_generator", "solar_battery"] as const).map((b) => (
              <Choice key={b} selected={a.backupPower === b} onClick={() => set({ backupPower: b })}>{LABELS.backupPower[b]}</Choice>
            ))}
          </Grid>
        </Group>
        <Group label="Vehicles" hint="Add each vehicle's fuel type. Tap one to remove it.">
          <div className="flex flex-wrap gap-2">
            {a.vehicleFuels.map((f, i) => (
              <button key={i} type="button" className="btn-ghost" aria-label={`Remove ${LABELS.fuel[f]} vehicle`} onClick={() => set({ vehicleFuels: a.vehicleFuels.filter((_, j) => j !== i) })}>
                {LABELS.fuel[f]} ✕
              </button>
            ))}
            {a.vehicleFuels.length === 0 && <span className="text-muted">No vehicles</span>}
          </div>
          {a.vehicleFuels.length < 6 && (
            <div className="grid grid-cols-2 gap-2">
              {(["gas", "diesel", "ev", "hybrid"] as const).map((f) => (
                <Choice key={f} selected={false} onClick={() => set({ vehicleFuels: [...a.vehicleFuels, f] })}>+ {LABELS.fuel[f]}</Choice>
              ))}
            </div>
          )}
        </Group>
      </>
    ),
  },
  {
    id: "storage",
    title: "Storage and evacuation",
    valid: (a) => (!a.storage.length ? "Pick at least one storage option." : a.evacuation.mode === "fallback" && (!a.evacuation.locationType || !a.evacuation.distanceMiles) ? "Pick your fallback location type and distance." : null),
    render: ({ a, set }) => (
      <>
        <Group label="Where can you store supplies? (select all)">
          <Grid>
            {(["garage", "basement", "closets", "shed", "limited"] as const).map((s) => (
              <Choice
                key={s}
                selected={a.storage.includes(s)}
                onClick={() => set({ storage: s === "limited" ? ["limited"] : toggle(a.storage.filter((x) => x !== "limited"), s) })}
              >
                {{ garage: "Garage", basement: "Basement", closets: "Closets", shed: "Shed", limited: "Very limited space" }[s]}
              </Choice>
            ))}
          </Grid>
        </Group>
        <Group label="If you had to leave home, where would you go?">
          <Grid cols={1}>
            <Choice selected={a.evacuation.mode === "shelter_only"} onClick={() => set({ evacuation: { mode: "shelter_only" } })}>We&apos;d shelter in place / public shelter</Choice>
            {(["friends_family", "second_property", "raw_land"] as const).map((t) => (
              <Choice key={t} selected={a.evacuation.mode === "fallback" && a.evacuation.locationType === t} onClick={() => set({ evacuation: { mode: "fallback", locationType: t, distanceMiles: a.evacuation.distanceMiles ?? 50 } })}>
                {LABELS.fallback[t]}
              </Choice>
            ))}
          </Grid>
        </Group>
        {a.evacuation.mode === "fallback" && (
          <Group label="About how far away is it?">
            <div className="grid grid-cols-3 gap-2">
              {[25, 50, 120, 250, 500, 1000].map((d) => (
                <Choice key={d} selected={a.evacuation.distanceMiles === d} onClick={() => set({ evacuation: { ...a.evacuation, distanceMiles: d } })}>{d === 1000 ? "500+ mi" : `~${d} mi`}</Choice>
              ))}
            </div>
          </Group>
        )}
      </>
    ),
  },
  {
    id: "budget",
    title: "Budget and skills",
    render: ({ a, set }) => (
      <>
        <Group label="What could you spend on preparedness over the next few months?">
          <Grid>
            {(["under_500", "500_1500", "1500_5000", "5000_plus"] as const).map((b) => (
              <Choice key={b} selected={a.budget === b} onClick={() => set({ budget: b })}>{LABELS.budget[b]}</Choice>
            ))}
          </Grid>
        </Group>
        <Group label="Skills in your household (optional)">
          <div className="grid grid-cols-3 gap-2">
            {(["first_aid", "camping", "tools"] as const).map((s) => (
              <Choice key={s} selected={a.skills.includes(s)} onClick={() => set({ skills: toggle(a.skills, s) })}>{{ first_aid: "First aid", camping: "Camping", tools: "Tools / DIY" }[s]}</Choice>
            ))}
          </div>
        </Group>
      </>
    ),
  },
];

const LOADING_STEPS = ["Checking your area's hazards", "Calculating water and food", "Running the fuel math", "Fitting gear to your budget", "Writing your plan"];

/** Numbers from the rules engine shown on the email screen, so people see what they're getting. */
function Teaser({ a }: { a: Answers }) {
  const w = computeWater(a, DEFAULT_CONSTANTS);
  const f = computeFood(a, DEFAULT_CONSTANTS);
  const h = household(a, DEFAULT_CONSTANTS);
  const n = (v: number) => v.toLocaleString("en-US");
  const stats: [string, string][] = [
    [`${n(w.storedGal)} gal`, "of water to store"],
    [`${n(f.totalLbs)} lb`, "of staple food"],
    ["18+", "sections, with checklists"],
  ];
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">Almost done. Your {{ 3: "72-hour", 14: "2-week", 30: "30-day", 90: "90-day" }[a.scenarioDays]} plan for {h.people} {h.people === 1 ? "person" : "people"}{a.pets.length ? " + pets" : ""} includes:</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {stats.map(([v, l]) => (
          <div key={l} className="rounded-lg bg-brand-soft p-2">
            <dt className="sr-only">{l}</dt>
            <dd className="text-xl font-bold tabular-nums">{v}</dd>
            <dd className="text-xs text-muted">{l}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm">Plus your priority checklist, fuel math, heat plan, local hazard steps and a gear list fitted to your budget.</p>
    </div>
  );
}

/** `onGenerate` replaces the server round-trip (standalone demo build): the caller builds the plan. */
export function Questionnaire({ id, initial, onGenerate }: { id: string; initial: Record<string, unknown>; onGenerate?: (answers: Answers) => Promise<void> }) {
  const router = useRouter();
  const [a, setA] = useState<Draft>(() => ({ ...DEFAULT_ANSWERS, ...(initial as Partial<Draft>) }) as Draft);
  const visible = useMemo(() => SCREENS.filter((s) => !s.show || s.show(a)), [a]);
  // "Change an answer" from a plan opens straight on that screen and offers "Update my plan".
  const editOne = typeof (initial as Draft)._screen === "string";
  const [step, setStep] = useState(() => {
    const i = editOne ? visible.findIndex((s) => s.id === (initial as Draft)._screen) : -1;
    return i >= 0 ? i : Math.min(Number(a._step ?? 0), visible.length - 1);
  });
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After mount: restore any newer local copy (e.g. answers typed while offline).
  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(`rp_q_${id}`) ?? "null") as Partial<Draft> | null;
      if (local) {
        setA((prev) => ({ ...prev, ...local }));
        if (typeof local._step === "number") setStep(local._step);
      }
    } catch {}
  }, [id]);

  // Autosave: localStorage immediately, server debounced. Answers go in the body, never the URL.
  useEffect(() => {
    const draft = { ...a, _step: step };
    try {
      localStorage.setItem(`rp_q_${id}`, JSON.stringify(draft));
    } catch {}
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (onGenerate) return;
    saveTimer.current = setTimeout(() => {
      fetch(`/api/questionnaire/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: draft }) }).catch(() => {});
    }, 700);
  }, [a, step, id, onGenerate]);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const screen = visible[Math.min(step, visible.length - 1)];
  const set = (patch: Partial<Draft>) => {
    setError("");
    setA((prev) => ({ ...prev, ...patch }));
  };
  const last = step >= visible.length - 1;
  const parsedAnswers = () => AnswersSchema.safeParse({ ...a, _step: undefined, _screen: undefined });

  async function build() {
    const parsed = parsedAnswers();
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check your answers.");
    const consent = { terms: !!a._terms, health: !!a._health };
    const consentError = checkConsent(parsed.data, consent);
    if (consentError) return setError(consentError);
    setGenerating(true);
    const timer = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1200);
    try {
      if (onGenerate) {
        await new Promise((r) => setTimeout(r, 1500));
        await onGenerate(parsed.data);
        return;
      }
      const r = await fetch(`/api/questionnaire/${id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: parsed.data, consent }) });
      const j = (await r.json()) as { planId?: string; error?: string };
      if (!r.ok || !j.planId) throw new Error(j.error ?? "Couldn't build the plan.");
      try {
        localStorage.removeItem(`rp_q_${id}`);
      } catch {}
      router.push(`/plan/${j.planId}`);
    } catch (e) {
      setGenerating(false);
      setError((e as Error).message);
    } finally {
      clearInterval(timer);
    }
  }

  async function next() {
    const msg = screen.valid?.(a);
    if (msg) return setError(msg);
    if (!last) return setStep(step + 1);
    const parsed = parsedAnswers();
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check your answers.");
    await build();
  }

  if (generating) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center" role="status" aria-live="polite">
        <div className="mx-auto size-12 rounded-full border-4 border-line border-t-brand animate-spin motion-reduce:animate-none" aria-hidden />
        <h1 className="mt-6 text-xl font-bold">Building your plan…</h1>
        <ul className="mt-6 space-y-2 text-left inline-block">
          {LOADING_STEPS.map((s, i) => (
            <li key={s} className={i <= loadingStep ? "text-ink" : "text-muted"}>{i < loadingStep ? "✓" : i === loadingStep ? "•" : "○"} {s}</li>
          ))}
        </ul>
      </div>
    );
  }

  const pct = Math.round(((step + 1) / visible.length) * 100);
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Step {step + 1} of {visible.length}</span>
        <span>{last ? "Last step" : `About ${Math.max(1, Math.round(((visible.length - step) * 25) / 60))} min left`} · Saved</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
        <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      <h1 ref={heading} tabIndex={-1} className="mt-6 text-2xl font-bold outline-none">{screen.title}</h1>
      <div className="mt-5 space-y-6">{screen.render({ a, set })}</div>
      {last && (() => {
        const p = parsedAnswers();
        return p.success ? <div className="mt-8"><Teaser a={p.data} /></div> : null;
      })()}
      {(last || editOne) && (
        <div className="mt-6 space-y-3">
          {screen.id !== "medical" && needsHealthConsent(a) && !a._health && <HealthConsent a={a} set={set} />}
          <ConsentBox id="termsConsent" checked={!!a._terms} onChange={(_terms) => set({ _terms })}>
            I understand this plan is general guidance, not professional advice, and I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener" className="underline">Terms of Use</a>.
          </ConsentBox>
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-danger font-medium">{error}</p>}
      <div className="mt-8 flex gap-3 sticky bottom-0 bg-bg py-3">
        <button type="button" className="btn-ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</button>
        {editOne ? (
          <button type="button" className="btn flex-1" onClick={async () => { const msg = screen.valid?.(a); if (msg) return setError(msg); await build(); }}>Update my plan</button>
        ) : (
          <button type="button" className="btn flex-1" onClick={next}>{last ? "Build my plan" : "Next"}</button>
        )}
      </div>
      {editOne && !last && <button type="button" className="text-sm underline text-muted" onClick={next}>Review the next question instead</button>}
    </div>
  );
}
