"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { areaName } from "@/lib/zip/states";
import { AnswersSchema, APPROACH_PLACE, DEFAULT_ANSWERS, destinationForApproach, isDrive, LABELS, migrateAnswers, storageOptions, type Answers, type PetGroupT } from "@/lib/answers/schema";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { computeFood, computeWater } from "@/lib/rules/engine";
import { atLeast, lookupZip, type Level, type ZipProfile } from "@/lib/zip/profile";
import { withoutConsentTicks, checkConsent, healthConsentMessage, needsHealthConsent, TERMS_REQUIRED_MSG } from "@/lib/legal";
import { BRAND } from "@/lib/brand";
import { BuildProgress } from "./BuildProgress";
import { BUILD_STAGES, parseStreamLines, type BuildStage, type OnStage } from "@/lib/plan/stages";

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
/** Remove a storage space the home no longer has; fall back to closets so one option stays picked. */
const dropStorage = (s: Answers["storage"], x: Answers["storage"][number]): Answers["storage"] => { const left = s.filter((v) => v !== x); return left.length ? left : ["closets"]; };

/** After a 5-digit ZIP: the region and its hazards rated moderate or higher (approximate, by ZIP prefix). */
const HAZARD_LABEL: [keyof ZipProfile, string][] = [
  ["hurricane", "Hurricanes"],
  ["flood", "Flooding"],
  ["winter", "Winter storms"],
  ["heat", "Extreme heat"],
  ["wildfire", "Wildfire"],
  ["earthquake", "Earthquakes"],
  ["tornado", "Tornadoes"],
];
function ZipArea({ zip }: { zip: string }) {
  if (!/^\d{5}$/.test(zip)) return <p id="zip-area" className="sr-only" aria-live="polite" />;
  const z = lookupZip(zip);
  const hazards = HAZARD_LABEL.filter(([k]) => atLeast(z[k] as Level, "moderate")).map(([k, label]) => `${label} (${z[k]})`);
  return (
    <div id="zip-area" aria-live="polite" className="mt-3 rounded-lg bg-brand-soft p-3 text-sm">
      <p>
        <span className="font-semibold text-brand">Your area:</span> {z.approximate ? "we'll use national averages for this ZIP" : areaName(z.region, z.state)}
      </p>
      {!z.approximate && (
        <p className="mt-1 text-muted">{hazards.length ? `Your plan will cover: ${hazards.join(", ")}.` : "No hazards rated moderate or higher; your plan covers outages and storms."}</p>
      )}
    </div>
  );
}

/* ---------- screens ---------- */
/** UX-4: a required box. When a submit fails because it's unticked, its message shows right beside it. */
function ConsentBox({ id, checked, onChange, children, error }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className={`flex items-start gap-3 rounded-lg bg-surface px-3 py-2.5 text-sm scroll-mt-24 scroll-mb-32 ${error ? "border-2 border-warn" : "border border-line"}`}>
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span>{children}</span>
      </label>
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-warn">{error}</p>}
    </div>
  );
}

function HealthConsent({ a, set, error }: { a: Draft; set: (patch: Partial<Draft>) => void; error?: string }) {
  return (
    <ConsentBox id="healthConsent" checked={!!a._health} onChange={(_health) => set({ _health })} error={error}>
      I agree that {BRAND.name} can use my medical and mobility answers to build my plan. They&apos;re encrypted, never sold and never used for marketing emails.
    </ConsentBox>
  );
}

interface ScreenProps {
  a: Draft;
  set: (patch: Partial<Draft>) => void;
  /** UX-4: the message for a required box on this screen, shown beside it. */
  err?: (field: ConsentField) => string | undefined;
}
type ConsentField = "healthConsent" | "termsConsent";
interface Screen {
  id: string;
  title: string;
  show?: (a: Draft) => boolean;
  valid?: (a: Draft) => string | null;
  render: (p: ScreenProps) => React.ReactNode;
}

/** UX-15: what each backup-power answer covers. A small portable power station isn't home backup. */
const BACKUP_HINT: Partial<Record<Answers["backupPower"], string>> = {
  none: "A portable power station counts as none",
  solar_battery: "Home battery, or solar with batteries",
};
/** UX-5: the two evacuation questions use clearly different words (the plan text keeps LABELS). */
const APPROACH_UI: Record<Answers["approach"], string> = {
  stay_home: "Stay home when it's safe",
  family_friends: "Go to family or friends",
  another_property: "Go to another place I own",
  hotel_shelter: "Go to a hotel or shelter",
  not_sure: "Not sure yet",
};
const DESTINATION_UI: Record<Answers["evacuation"]["destination"], string> = {
  friends_family: "A friend's or relative's home",
  second_property: "A second home or cabin",
  raw_land: "Land with no buildings",
  hotel: "A hotel or motel",
  public_shelter: "A public shelter",
  not_sure: "I don't know yet",
};
const DESTINATION_HINT: Partial<Record<Answers["evacuation"]["destination"], string>> = {
  raw_land: "Land you can use, but no house",
  public_shelter: "Opened by officials",
};
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
          <input id="zip" className="input mt-2 text-lg tracking-widest max-w-[10rem]" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={a.zip} onChange={(e) => set({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })} aria-describedby="zip-area" />
          <ZipArea zip={a.zip} />
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
                <button type="button" className="text-sm underline text-brand min-h-[44px] px-2" onClick={() => set({ pets: a.pets.filter((_, j) => j !== i) })}>Remove</button>
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
    valid: (a) => (needsHealthConsent(a) && !a._health ? healthConsentMessage(a) : null),
    render: ({ a, set, err }) => (
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
        {needsHealthConsent(a) && <HealthConsent a={a} set={set} error={err?.("healthConsent")} />}
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
        <Group label="Floors (not counting a basement)" hint="Floors in your home. In an apartment, count the floors of your unit, not the building.">
          <Stepper label="floors" value={a.floors} min={1} max={5} onChange={(floors) => set({ floors })} />
        </Group>
        <Group label="Your home has… (select all)" hint="Just the property. You'll pick where you can store supplies later.">
          <div className="grid grid-cols-2 gap-2">
            <Choice selected={a.hasBasement} onClick={() => set({ hasBasement: !a.hasBasement, storage: a.hasBasement ? dropStorage(a.storage, "basement") : a.storage })}>Basement / lower level</Choice>
            <Choice selected={a.hasGarage} onClick={() => set({ hasGarage: !a.hasGarage, storage: a.hasGarage ? dropStorage(a.storage, "garage") : a.storage })}>Garage</Choice>
            <Choice selected={a.hasYard} onClick={() => set({ hasYard: !a.hasYard })}>Yard</Choice>
            <Choice selected={a.hasShed} onClick={() => set({ hasShed: !a.hasShed, storage: a.hasShed ? dropStorage(a.storage, "shed") : a.storage })}>Shed</Choice>
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
        <Group label="Do you already have a water filter for emergencies?" hint="Not a fridge or pitcher filter.">
          <Grid>
            <Choice selected={a.waterFilter === "household"} onClick={() => set({ waterFilter: "household" })} sub="Gravity or pump, fills containers">Household filter</Choice>
            <Choice selected={a.waterFilter === "personal"} onClick={() => set({ waterFilter: "personal" })} sub="Straw or bottle, like LifeStraw">Personal filter</Choice>
            <Choice selected={a.waterFilter === "both"} onClick={() => set({ waterFilter: "both" })}>Both</Choice>
            <Choice selected={a.waterFilter === "none"} onClick={() => set({ waterFilter: "none" })}>None</Choice>
          </Grid>
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
              <Choice key={b} selected={a.backupPower === b} onClick={() => set({ backupPower: b })} sub={BACKUP_HINT[b]}>{LABELS.backupPower[b]}</Choice>
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
    title: "Storage",
    valid: (a) => (!a.storage.length ? "Pick at least one option." : null),
    render: ({ a, set }) => (
      <Group label="Which spaces can you realistically use for emergency supplies? (select all)">
        <Grid>
          {storageOptions(a).map((s) => (
            <Choice
              key={s}
              selected={a.storage.includes(s)}
              sub={s === "limited" ? "Compact kits" : s === "none" ? "Buy when a storm is forecast" : undefined}
              onClick={() => set({ storage: s === "limited" || s === "none" ? [s] : toggle(a.storage.filter((x) => x !== "limited" && x !== "none"), s) })}
            >
              {LABELS.storage[s]}
            </Choice>
          ))}
        </Grid>
      </Group>
    ),
  },
  {
    id: "evacuation",
    title: "If you have to leave",
    valid: (a) => (isDrive(a.evacuation.destination) && !a.evacuation.distanceMiles ? "Pick about how far away it is." : null),
    render: ({ a, set }) => {
      // A saved answer whose destination doesn't fit the approach (older plans) gets the full question.
      const p0 = APPROACH_PLACE[a.approach];
      const place = p0 && (a.evacuation.destination === p0.main || a.evacuation.destination === p0.alt) ? p0 : undefined;
      const pick = (d: Answers["evacuation"]["destination"]) => set({ evacuation: isDrive(d) ? { destination: d, distanceMiles: a.evacuation.distanceMiles ?? 50 } : { destination: d } });
      return (
        <>
          <Group label="In an emergency, what would you rather do?">
            <Grid cols={1}>
              {(["stay_home", "family_friends", "another_property", "hotel_shelter", "not_sure"] as const).map((p) => (
                <Choice
                  key={p}
                  selected={a.approach === p}
                  onClick={() => {
                    // UX-5: a place answer fills in where you'd go; only the distance is left to ask.
                    const d = destinationForApproach(p, a.evacuation.destination);
                    set(d ? { approach: p, evacuation: isDrive(d) ? { destination: d, distanceMiles: a.evacuation.distanceMiles ?? 50 } : { destination: d } } : { approach: p });
                  }}
                >
                  {APPROACH_UI[p]}
                </Choice>
              ))}
            </Grid>
          </Group>
          {place ? (
            place.alt && (
              <Group label="Which one?">
                <Grid>
                  {[place.main, place.alt].map((d) => (
                    <Choice key={d} selected={a.evacuation.destination === d} onClick={() => pick(d)} sub={DESTINATION_HINT[d]}>{DESTINATION_UI[d]}</Choice>
                  ))}
                </Grid>
              </Group>
            )
          ) : (
            <Group label="If officials told you to leave, where could you go?">
              <Grid>
                {(["friends_family", "second_property", "raw_land", "hotel", "public_shelter", "not_sure"] as const).map((d) => (
                  <Choice key={d} selected={a.evacuation.destination === d} onClick={() => pick(d)} sub={DESTINATION_HINT[d]}>{DESTINATION_UI[d]}</Choice>
                ))}
              </Grid>
            </Group>
          )}
          {isDrive(a.evacuation.destination) && (
            <Group label="About how far away is it?">
              <div className="grid grid-cols-3 gap-2">
                {[25, 50, 120, 250, 500, 1000].map((d) => (
                  <Choice key={d} selected={a.evacuation.distanceMiles === d} onClick={() => set({ evacuation: { ...a.evacuation, distanceMiles: d } })}>{d === 1000 ? "500+ mi" : `~${d} mi`}</Choice>
                ))}
              </div>
            </Group>
          )}
        </>
      );
    },
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


/** Numbers from the rules engine shown on the email screen, so people see what they're getting. */
function Teaser({ a }: { a: Answers }) {
  const w = computeWater(a, DEFAULT_CONSTANTS);
  const f = computeFood(a, DEFAULT_CONSTANTS);
  const short = (v: number) => (v >= 100_000 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v) : v.toLocaleString("en-US"));
  // UX-22: one line in the sticky bar, right above "Build my plan", so it's always seen before building.
  return (
    // UX-27: one short line at 375 px, so the sticky bar stays small; compact numbers keep big households on one line.
    // On narrower phones it wraps rather than running off the screen.
    <p className="mb-1.5 text-sm text-muted" data-testid="plan-teaser">
      <span className="font-semibold text-ink">Almost done:</span> <span className="tabular-nums">{short(w.storedGal)} gal</span> of water and <span className="tabular-nums">{short(f.totalKcal)}</span> calories
    </p>
  );
}

/** `onGenerate` replaces the server round-trip (standalone demo build): the caller builds the plan. */
export function Questionnaire({ id, initial, onGenerate }: { id: string; initial: Record<string, unknown>; onGenerate?: (answers: Answers, onStage: OnStage) => Promise<void> }) {
  const router = useRouter();
  const [a, setA] = useState<Draft>(() => ({ ...DEFAULT_ANSWERS, ...(migrateAnswers(initial) as Partial<Draft>) }) as Draft);
  const visible = useMemo(() => SCREENS.filter((s) => !s.show || s.show(a)), [a]);
  // "Change an answer" from a plan opens straight on that screen and offers "Update my plan".
  const editOne = typeof (initial as Draft)._screen === "string";
  const [step, setStep] = useState(() => {
    const i = editOne ? visible.findIndex((s) => s.id === (initial as Draft)._screen) : -1;
    return i >= 0 ? i : Math.min(Number(a._step ?? 0), visible.length - 1);
  });
  const [error, setError] = useState("");
  const [consentErr, setConsentErr] = useState<{ field: ConsentField; msg: string } | null>(null);
  // UX-4: on a failed submit, bring the unticked box into view above the sticky bar and focus it.
  useEffect(() => {
    if (!consentErr) return;
    const el = document.getElementById(consentErr.field);
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
    el?.focus({ preventScroll: true });
  }, [consentErr]);
  const [generating, setGenerating] = useState(false);
  const [stagesDone, setStagesDone] = useState<BuildStage[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After mount: restore any newer local copy (e.g. answers typed while offline).
  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(`rp_q_${id}`) ?? "null") as Partial<Draft> | null;
      if (local) {
        setA((prev) => ({ ...prev, ...(migrateAnswers(withoutConsentTicks(local)) as Partial<Draft>) }));
        if (typeof local._step === "number") setStep(local._step);
      }
    } catch {}
  }, [id]);

  // Autosave: localStorage immediately, server debounced. Answers go in the body, never the URL.
  useEffect(() => {
    // Consent ticks stay on this screen only: never saved, so a copied plan never starts pre-ticked.
    const draft = { ...withoutConsentTicks(a), _step: step };
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
    setConsentErr(null);
    setA((prev) => ({ ...prev, ...patch }));
  };
  const last = step >= visible.length - 1;
  const parsedAnswers = () => AnswersSchema.safeParse({ ...a, _step: undefined, _screen: undefined });

  /** The first required box left unticked on this screen, in screen order (health, then Terms). */
  function missingConsent(): { field: ConsentField; msg: string } | null {
    const onConsentScreen = last || editOne;
    const healthHere = screen.id === "medical" || onConsentScreen;
    if (healthHere && needsHealthConsent(a) && !a._health) return { field: "healthConsent", msg: healthConsentMessage(a) };
    if (onConsentScreen && !a._terms) return { field: "termsConsent", msg: TERMS_REQUIRED_MSG };
    return null;
  }

  async function build() {
    const parsed = parsedAnswers();
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check your answers.");
    const consent = { terms: !!a._terms, health: !!a._health };
    const consentError = checkConsent(parsed.data, consent);
    if (consentError) return setConsentErr(missingConsent() ?? { field: "termsConsent", msg: consentError });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // A rebuild from "Change an answer" keeps the inline spinner; only the first build shows the stages card (D11).
    setGenerating(true);
    setStagesDone([]);
    const onStage: OnStage = (st) => setStagesDone((d) => (d.includes(st) ? d : [...d, st]));
    try {
      if (onGenerate) {
        await onGenerate(parsed.data, onStage);
        return;
      }
      const j = await requestPlan(id, { answers: parsed.data, consent }, onStage);
      try {
        localStorage.removeItem(`rp_q_${id}`);
      } catch {}
      router.push(`/plan/${j.planId}`);
    } catch (e) {
      setGenerating(false);
      setError((e as Error).message);
    }
  }

  async function next() {
    const missing = missingConsent();
    if (missing) return setConsentErr(missing);
    const msg = screen.valid?.(a);
    if (msg) return setError(msg);
    if (!last) return setStep(step + 1);
    const parsed = parsedAnswers();
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check your answers.");
    await build();
  }

  if (generating && !editOne) return <BuildProgress done={stagesDone} />;
  if (generating) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center" role="status" aria-live="polite">
        <div className="mx-auto size-10 rounded-full border-4 border-line border-t-accent animate-spin motion-reduce:animate-none" aria-hidden />
        <p className="mt-4 font-semibold">Updating your plan…</p>
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
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <h1 ref={heading} tabIndex={-1} className="mt-6 text-2xl font-bold outline-none">{screen.title}</h1>
      <div className="mt-5 space-y-6">{screen.render({ a, set, err: (f) => (consentErr?.field === f ? consentErr.msg : undefined) })}</div>
      {/* UX-4: the required boxes come right after the questions, before the teaser and the sticky bar. */}
      {(last || editOne) && (
        <div className="mt-4 space-y-2">
          {screen.id !== "medical" && needsHealthConsent(a) && <HealthConsent a={a} set={set} error={consentErr?.field === "healthConsent" ? consentErr.msg : undefined} />}
          <ConsentBox id="termsConsent" checked={!!a._terms} onChange={(_terms) => set({ _terms })} error={consentErr?.field === "termsConsent" ? consentErr.msg : undefined}>
            I understand this plan is general guidance, not professional advice, and I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener" className="tap-inline underline">Terms of Use</a>.
          </ConsentBox>
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-warn font-medium">{error}</p>}
      <div className="mt-6 sticky bottom-0 bg-bg pt-2 pb-3">
        {last && (() => {
          const p = parsedAnswers();
          return p.success ? <Teaser a={p.data} /> : null;
        })()}
        <div className="flex gap-3">
        <button type="button" className="btn-ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</button>
        {editOne ? (
          <button type="button" className="btn flex-1" onClick={async () => { const missing = missingConsent(); if (missing) return setConsentErr(missing); const msg = screen.valid?.(a); if (msg) return setError(msg); await build(); }}>Update my plan</button>
        ) : (
          <button type="button" className="btn flex-1" onClick={next}>{last ? "Build my plan" : "Next"}</button>
        )}
        </div>
      </div>
      {editOne && !last && <button type="button" className="text-sm underline text-muted" onClick={next}>Review the next question instead</button>}
    </div>
  );
}

/**
 * POST the answers and follow the build stages (D11). The server streams one JSON line per finished stage,
 * then the plan id. If the stream is buffered or the server answers with plain JSON, every stage is marked
 * done when the final answer arrives, which is still true.
 */
async function requestPlan(id: string, body: unknown, onStage: OnStage): Promise<{ planId: string }> {
  const r = await fetch(`/api/questionnaire/${id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson, application/json" },
    body: JSON.stringify(body),
  });
  const type = r.headers.get("content-type") ?? "";
  if (!type.includes("ndjson") || !r.body) {
    const j = (await r.json()) as { planId?: string; error?: string };
    if (!r.ok || !j.planId) throw new Error(j.error ?? "Couldn't build the plan.");
    for (const s of BUILD_STAGES) onStage(s.id);
    return { planId: j.planId };
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    const { lines, rest } = parseStreamLines(done ? buf + "\n" : buf);
    buf = rest;
    for (const line of lines) {
      if ("stage" in line) onStage(line.stage);
      else if ("error" in line) throw new Error(line.error);
      else if ("planId" in line) {
        for (const s of BUILD_STAGES) onStage(s.id);
        return { planId: line.planId };
      }
    }
    if (done) throw new Error("Couldn't build the plan. Try again.");
  }
}
