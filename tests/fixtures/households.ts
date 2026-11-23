import { AnswersSchema, DEFAULT_ANSWERS, migrateAnswers, type Answers } from "@/lib/answers/schema";

/** Answer keys from v1 fixtures (evacuation {mode, locationType}, hasFiltration), still accepted here. */
type LegacyKeys = {
  hasFiltration?: boolean;
  evacuation?: Answers["evacuation"] | { mode: "shelter_only" | "fallback"; locationType?: "friends_family" | "second_property" | "raw_land"; distanceMiles?: number };
};
export type FixtureAnswers = Omit<Partial<Answers>, "evacuation"> & LegacyKeys;

/**
 * A household with the given answers over the defaults (ZIP 11746). Accepts v1 keys and migrates them,
 * so older fixtures keep describing the same households.
 */
export const at = (over: FixtureAnswers): Answers => {
  const legacy = "hasFiltration" in over || (!!over.evacuation && "mode" in over.evacuation);
  const migrated = legacy ? (migrateAnswers({ ...over, version: 1 }) as Partial<Answers>) : (over as Partial<Answers>);
  // Parsed, so presence follows usability exactly as it does for real answers (a garage they store in is a garage they have).
  return AnswersSchema.parse({ ...DEFAULT_ANSWERS, zip: "11746", ...migrated, hasShed: migrated.hasShed ?? !!over.storage?.includes("shed") });
};

export { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
