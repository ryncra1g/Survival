import { DEFAULT_ANSWERS, type Answers } from "@/lib/answers/schema";

export const at = (over: Partial<Answers>): Answers => ({ ...DEFAULT_ANSWERS, zip: "11746", ...over });

/** The spec's sample household: Long Island, 2 adults, kids 2 & 4, a dog, gas heat, no backup power, 90 days. */
export const SAMPLE_HOUSEHOLD: Answers = at({
  zip: "11746",
  scenarioDays: 90,
  adults: 2,
  childrenAges: [2, 4],
  elderlyOrMobility: false,
  toddlerNeeds: ["diapers"],
  pets: [{ type: "dog", count: 1, size: "medium", specialDiet: false, medications: false }],
  hasPrescriptions: false,
  poweredDevices: [],
  homeType: "house",
  floors: 2,
  hasBasement: true,
  hasGarage: true,
  hasYard: true,
  heatSources: ["natural_gas"],
  cooking: "gas",
  waterSource: "municipal",
  hasFiltration: false,
  backupPower: "none",
  vehicleFuels: ["gas", "gas"],
  storage: ["garage", "basement"],
  evacuation: { mode: "fallback", locationType: "raw_land", distanceMiles: 120 },
  budget: "1500_5000",
  skills: [],
});
