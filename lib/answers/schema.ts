import { z } from "zod";

/**
 * Questionnaire answers. Every field is an enum, boolean or bounded number —
 * there is deliberately no free text (smaller privacy + prompt-injection surface).
 * Bump ANSWERS_VERSION and add a migration in `migrateAnswers` when this changes.
 */
export const ANSWERS_VERSION = 1;

export const ScenarioDays = z.union([z.literal(3), z.literal(14), z.literal(30), z.literal(90)]);
export const HeatSource = z.enum(["natural_gas", "oil", "propane", "electric", "wood"]);
export const Cooking = z.enum(["gas", "electric", "induction"]);
export const VehicleFuel = z.enum(["gas", "diesel", "ev", "hybrid"]);
export const Storage = z.enum(["garage", "basement", "closets", "shed", "limited"]);
export const Budget = z.enum(["under_500", "500_1500", "1500_5000", "5000_plus"]);
export const PoweredDevice = z.enum(["cpap", "oxygen", "nebulizer", "other"]);
export const ToddlerNeed = z.enum(["diapers", "formula", "milk"]);
export const Skill = z.enum(["first_aid", "camping", "tools"]);
export const BackupPower = z.enum(["none", "portable_generator", "standby_generator", "solar_battery"]);
export const FallbackType = z.enum(["friends_family", "second_property", "raw_land"]);

export const PetGroup = z.object({
  type: z.enum(["dog", "cat", "other"]),
  count: z.number().int().min(1).max(10),
  size: z.enum(["small", "medium", "large"]),
  specialDiet: z.boolean(),
  medications: z.boolean(),
});

export const AnswersSchema = z
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
    hasBasement: z.boolean(),
    hasGarage: z.boolean(),
    hasYard: z.boolean(),
    heatSources: z.array(HeatSource).min(1).max(5),
    cooking: Cooking,
    waterSource: z.enum(["municipal", "well"]),
    hasFiltration: z.boolean(),
    backupPower: BackupPower,
    vehicleFuels: z.array(VehicleFuel).max(6),
    storage: z.array(Storage).min(1).max(5),
    evacuation: z.object({
      mode: z.enum(["shelter_only", "fallback"]),
      locationType: FallbackType.optional(),
      distanceMiles: z.number().int().min(1).max(2000).optional(),
    }),
    budget: Budget,
    skills: z.array(Skill).max(3),
  })
  .superRefine((a, ctx) => {
    if (a.evacuation.mode === "fallback" && (!a.evacuation.locationType || !a.evacuation.distanceMiles)) {
      ctx.addIssue({ code: "custom", path: ["evacuation"], message: "Pick a fallback location type and distance" });
    }
  });

export type Answers = z.infer<typeof AnswersSchema>;
export type PetGroupT = z.infer<typeof PetGroup>;

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
  heatSources: ["natural_gas"],
  cooking: "gas",
  waterSource: "municipal",
  hasFiltration: false,
  backupPower: "none",
  vehicleFuels: ["gas"],
  storage: ["closets"],
  evacuation: { mode: "shelter_only" },
  budget: "500_1500",
  skills: [],
};

export function migrateAnswers(raw: unknown): unknown {
  // v1 is the first version; future migrations go here.
  return raw;
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
  fallback: {
    friends_family: "Friends/family",
    second_property: "Second property",
    raw_land: "Raw land",
  } as Record<string, string>,
  home: { house: "House", townhouse: "Townhouse", apartment: "Apartment" } as Record<string, string>,
  device: { cpap: "CPAP/BiPAP", oxygen: "Oxygen concentrator", nebulizer: "Nebulizer", other: "Other powered device" } as Record<
    string,
    string
  >,
};
