import { z } from "zod";

/**
 * Questionnaire answers. Every field is an enum, boolean or bounded number —
 * there is deliberately no free text (smaller privacy + prompt-injection surface).
 * Bump ANSWERS_VERSION and add a migration in `migrateAnswers` when this changes.
 *
 * v2 (owner brief D4, D5, D6): evacuation preference + destination, a shed as a home feature,
 * "other indoor space" and "no suitable storage", and the water-filter type.
 */
export const ANSWERS_VERSION = 2;

export const ScenarioDays = z.union([z.literal(3), z.literal(14), z.literal(30), z.literal(90)]);
export const HeatSource = z.enum(["natural_gas", "oil", "propane", "electric", "wood"]);
export const Cooking = z.enum(["gas", "electric", "induction"]);
export const VehicleFuel = z.enum(["gas", "diesel", "ev", "hybrid"]);
/** Spaces someone can realistically use for supplies (D5). `limited` and `none` stand alone. */
export const Storage = z.enum(["garage", "basement", "shed", "closets", "other_indoor", "limited", "none"]);
export const Budget = z.enum(["under_500", "500_1500", "1500_5000", "5000_plus"]);
export const PoweredDevice = z.enum(["cpap", "oxygen", "nebulizer", "other"]);
export const ToddlerNeed = z.enum(["diapers", "formula", "milk"]);
export const Skill = z.enum(["first_aid", "camping", "tools"]);
export const BackupPower = z.enum(["none", "portable_generator", "standby_generator", "solar_battery"]);
/** D4 Q1: "During an emergency, what's your preferred approach?" */
export const Approach = z.enum(["stay_home", "family_friends", "another_property", "hotel_shelter", "not_sure"]);
/** D4 Q2: "If your home becomes unsafe or officials order an evacuation, where could you go?" */
export const Destination = z.enum(["friends_family", "second_property", "raw_land", "hotel", "public_shelter", "not_sure"]);
/** Destinations reached by car, so the plan works out the distance and fuel. */
export const DRIVE_DESTINATIONS = ["friends_family", "second_property", "raw_land", "hotel"] as const;
export type DriveDestination = (typeof DRIVE_DESTINATIONS)[number];
/** D6: household filter (gravity or pump, fills containers), personal (straw or bottle), both or none. */
export const WaterFilter = z.enum(["household", "personal", "both", "none"]);

/** À la carte gear slots a person can set to essential / standard / premium. */
export const GEAR_SLOTS = ["water", "generator", "battery-apt", "battery-house", "filter", "two-way", "go-bag", "shelter", "vehicle-kit", "food"] as const;
export const GearLevel = z.enum(["essential", "standard", "premium"]);

export const PetGroup = z.object({
  type: z.enum(["dog", "cat", "other"]),
  count: z.number().int().min(1).max(10),
  size: z.enum(["small", "medium", "large"]),
  specialDiet: z.boolean(),
  medications: z.boolean(),
});

const AnswersObject = z
  .object({
    version: z.literal(ANSWERS_VERSION),
    zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
    scenarioDays: ScenarioDays,
    adults: z.number().int().min(1).max(12),
    childrenAges: z.array(z.number().int().min(0).max(17)).max(10),
    elderlyOrMobility: z.boolean(),
    toddlerNeeds: z.array(ToddlerNeed).max(3),
    pets: z.array(PetGroup).max(6),
    hasPrescriptions: z.boolean(),
    poweredDevices: z.array(PoweredDevice).max(4),
    homeType: z.enum(["house", "townhouse", "apartment"]),
    floors: z.number().int().min(1).max(5),
    /** "Your home has…": property features only (D5). */
    hasBasement: z.boolean(),
    hasGarage: z.boolean(),
    hasYard: z.boolean(),
    hasShed: z.boolean(),
    heatSources: z.array(HeatSource).min(1).max(5),
    cooking: Cooking,
    waterSource: z.enum(["municipal", "well"]),
    waterFilter: WaterFilter,
    backupPower: BackupPower,
    vehicleFuels: z.array(VehicleFuel).max(6),
    /** Which spaces they can realistically use (usability), separate from what the home has (presence). */
    storage: z.array(Storage).min(1).max(6),
    approach: Approach,
    evacuation: z.object({
      destination: Destination,
      distanceMiles: z.number().int().min(1).max(2000).optional(),
    }),
    budget: Budget,
    skills: z.array(Skill).max(3),
    /** À la carte overrides, e.g. { generator: "premium", water: "essential" }. Optional. */
    gearChoices: z.partialRecord(z.enum(GEAR_SLOTS), GearLevel).optional(),
  })
  .superRefine((a, ctx) => {
    if (isDrive(a.evacuation.destination) && !a.evacuation.distanceMiles) {
      ctx.addIssue({ code: "custom", path: ["evacuation"], message: "Pick about how far away it is" });
    }
    if (a.storage.length > 1 && a.storage.some((s) => s === "limited" || s === "none")) {
      ctx.addIssue({ code: "custom", path: ["storage"], message: "\"Very limited space\" and \"No suitable storage\" can't be combined with other spaces" });
    }
  });

/** Every parse migrates older saved answers first, so v1 plans, drafts and fixtures keep working. */
export const AnswersSchema = z.preprocess((raw) => normalizePresence(migrateAnswers(raw)), AnswersObject);

export type Answers = z.infer<typeof AnswersObject>;
export type PetGroupT = z.infer<typeof PetGroup>;

export const isDrive = (d: string | undefined): d is DriveDestination => !!d && (DRIVE_DESTINATIONS as readonly string[]).includes(d);

/** Partial answers saved while the user is mid-questionnaire (autosave). */
export const DraftAnswersSchema = z.record(z.string(), z.unknown());

export const DEFAULT_ANSWERS: Answers = {
  version: ANSWERS_VERSION,
  zip: "",
  scenarioDays: 14,
  adults: 2,
  childrenAges: [],
  elderlyOrMobility: false,
  toddlerNeeds: [],
  pets: [],
  hasPrescriptions: false,
  poweredDevices: [],
  homeType: "house",
  floors: 2,
  hasBasement: false,
  hasGarage: false,
  hasYard: false,
  hasShed: false,
  heatSources: ["natural_gas"],
  cooking: "gas",
  waterSource: "municipal",
  waterFilter: "none",
  backupPower: "none",
  vehicleFuels: ["gas"],
  storage: ["closets"],
  approach: "stay_home",
  evacuation: { destination: "not_sure" },
  budget: "500_1500",
  skills: [],
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * v1 → v2. Idempotent; leaves anything it doesn't recognise alone (validation reports it).
 * - evacuation {mode: shelter_only} → approach stay_home, destination not_sure
 * - evacuation {mode: fallback, locationType} → that destination; approach family_friends or another_property
 * - hasFiltration true/false → waterFilter household/none
 * - storage "shed" → also hasShed (a shed they use is a shed they have)
 */
export function migrateAnswers(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  if (raw.version === ANSWERS_VERSION) return raw;
  const a: Obj = { ...raw };
  const ev = a.evacuation;
  if (isObj(ev) && "mode" in ev) {
    if (ev.mode === "fallback" && typeof ev.locationType === "string") {
      a.evacuation = { destination: ev.locationType, ...(typeof ev.distanceMiles === "number" ? { distanceMiles: ev.distanceMiles } : {}) };
      a.approach ??= ev.locationType === "friends_family" ? "family_friends" : "another_property";
    } else {
      a.evacuation = { destination: "not_sure" };
      a.approach ??= "stay_home";
    }
  }
  if ("hasFiltration" in a) {
    if (!("waterFilter" in a)) a.waterFilter = a.hasFiltration ? "household" : "none";
    delete a.hasFiltration;
  }
  a.hasShed ??= Array.isArray(a.storage) && a.storage.includes("shed");
  a.approach ??= "stay_home";
  if (!isObj(a.evacuation)) a.evacuation = { destination: "not_sure" };
  if (raw.version === 1 || raw.version === undefined) a.version = ANSWERS_VERSION;
  return a;
}

/** Presence follows usability: someone who can store supplies in their garage has a garage (D5). */
function normalizePresence(raw: unknown): unknown {
  if (!isObj(raw) || !Array.isArray(raw.storage)) return raw;
  const s = raw.storage as string[];
  return {
    ...raw,
    hasGarage: raw.hasGarage || s.includes("garage"),
    hasBasement: raw.hasBasement || s.includes("basement"),
    hasShed: raw.hasShed || s.includes("shed"),
  };
}

/** Storage spaces to offer, given what the home has (D5): only spaces they have, plus indoor options. */
export function storageOptions(a: Pick<Answers, "hasGarage" | "hasBasement" | "hasShed">): z.infer<typeof Storage>[] {
  return [
    ...(a.hasGarage ? (["garage"] as const) : []),
    ...(a.hasBasement ? (["basement"] as const) : []),
    ...(a.hasShed ? (["shed"] as const) : []),
    "closets",
    "other_indoor",
    "limited",
    "none",
  ];
}

export const LABELS = {
  scenarioDays: { 3: "72 hours", 14: "2 weeks", 30: "30 days", 90: "90 days" } as Record<number, string>,
  heat: {
    natural_gas: "Natural gas",
    oil: "Heating oil",
    propane: "Propane",
    electric: "Electric / heat pump",
    wood: "Wood",
  } as Record<string, string>,
  cooking: { gas: "Gas", electric: "Electric", induction: "Induction" } as Record<string, string>,
  backupPower: {
    none: "None",
    portable_generator: "Portable generator",
    standby_generator: "Standby generator",
    solar_battery: "Solar / battery",
  } as Record<string, string>,
  budget: {
    under_500: "Under $500",
    "500_1500": "$500–1,500",
    "1500_5000": "$1,500–5,000",
    "5000_plus": "$5,000+",
  } as Record<string, string>,
  fuel: { gas: "Gasoline", diesel: "Diesel", ev: "Electric (EV)", hybrid: "Hybrid" } as Record<string, string>,
  /** Destination labels (D4 Q2). Kept under `fallback` for older callers. */
  fallback: {
    friends_family: "Friends/family",
    second_property: "Second property",
    raw_land: "Raw land",
    hotel: "Hotel or motel",
    public_shelter: "Public shelter",
    not_sure: "Not sure yet",
  } as Record<string, string>,
  approach: {
    stay_home: "Stay home when it's safe",
    family_friends: "Family or friends",
    another_property: "Another property",
    hotel_shelter: "Hotel or public shelter",
    not_sure: "Not sure yet",
  } as Record<string, string>,
  storage: {
    garage: "Garage",
    basement: "Basement / lower level",
    shed: "Shed",
    closets: "Closets",
    other_indoor: "Other indoor space",
    limited: "Very limited space",
    none: "No suitable storage",
  } as Record<string, string>,
  waterFilter: {
    household: "Household filter",
    personal: "Personal filter",
    both: "Both",
    none: "None",
  } as Record<string, string>,
  home: { house: "House", townhouse: "Townhouse", apartment: "Apartment" } as Record<string, string>,
  device: { cpap: "CPAP/BiPAP", oxygen: "Oxygen concentrator", nebulizer: "Nebulizer", other: "Other powered device" } as Record<
    string,
    string
  >,
};

/** A household filter (not a straw or bottle) is what makes more water for everyone (D6). */
export const hasHouseholdFilter = (a: Pick<Answers, "waterFilter">) => a.waterFilter === "household" || a.waterFilter === "both";
export const hasPersonalFilter = (a: Pick<Answers, "waterFilter">) => a.waterFilter === "personal" || a.waterFilter === "both";

/**
 * Apply one à la carte choice. "mix" (food only, D7) clears the food choice so the recommended mix
 * from the household's answers applies again.
 */
export function withGearChoice(a: Answers, group: (typeof GEAR_SLOTS)[number], level: z.infer<typeof GearLevel> | "mix"): Answers {
  const next = { ...(a.gearChoices ?? {}) };
  if (level === "mix") delete next[group];
  else next[group] = level;
  return { ...a, gearChoices: next };
}
