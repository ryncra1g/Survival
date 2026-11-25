import type { Answers } from "@/lib/answers/schema";
import { at } from "./households";

/**
 * The 300-household fuzz from tests/safety.test.ts (same PRNG, seed and draws), so other rules can run over the
 * same households. Each call starts from seed 42, so it always returns the same list.
 */
export function fuzzHouseholds(n = 300): Answers[] {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const some = <T,>(xs: readonly T[]) => xs.filter(() => rnd() < 0.4);
  const zips = ["11746", "10001", "33101", "70112", "94110", "98101", "55401", "80202", "85004", "99501", "60601", "00000", "77002", "02108"];
  const out: Answers[] = [];
  for (let i = 0; i < n; i++) {
    const homeType = pick(["house", "townhouse", "apartment"] as const);
    out.push(
      at({
        zip: pick(zips),
        scenarioDays: pick([3, 14, 30, 90] as const),
        adults: 1 + Math.floor(rnd() * 4),
        childrenAges: some([0, 1, 2, 3, 5, 9, 15]),
        elderlyOrMobility: rnd() < 0.3,
        toddlerNeeds: some(["diapers", "formula", "milk"] as const),
        pets: rnd() < 0.5 ? [{ type: pick(["dog", "cat", "other"] as const), count: 1 + Math.floor(rnd() * 2), size: pick(["small", "medium", "large"] as const), specialDiet: rnd() < 0.3, medications: rnd() < 0.3 }] : [],
        hasPrescriptions: rnd() < 0.5,
        poweredDevices: some(["cpap", "oxygen", "nebulizer"] as const),
        homeType,
        floors: 1 + Math.floor(rnd() * 3),
        hasBasement: rnd() < 0.5,
        hasGarage: rnd() < 0.5,
        hasYard: rnd() < 0.5,
        heatSources: [pick(["natural_gas", "oil", "propane", "electric", "wood"] as const), ...some(["wood", "electric"] as const)].filter((v, j, arr) => arr.indexOf(v) === j),
        cooking: pick(["gas", "electric", "induction"] as const),
        waterSource: pick(["municipal", "well"] as const),
        hasFiltration: rnd() < 0.3,
        backupPower: pick(["none", "portable_generator", "standby_generator", "solar_battery"] as const),
        vehicleFuels: some(["gas", "diesel", "ev", "hybrid"] as const),
        storage: [pick(["garage", "basement", "closets", "shed", "limited"] as const)],
        evacuation: rnd() < 0.5 ? { mode: "fallback", locationType: pick(["friends_family", "second_property", "raw_land"] as const), distanceMiles: 10 + Math.floor(rnd() * 400) } : { mode: "shelter_only" },
        budget: pick(["under_500", "500_1500", "1500_5000", "5000_plus"] as const),
      }),
    );
  }
  return out;
}
