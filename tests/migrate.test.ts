import { describe, expect, it } from "vitest";
import { ANSWERS_VERSION, AnswersSchema, migrateAnswers, storageOptions } from "@/lib/answers/schema";
import { buildPlan } from "./helpers/build";

/** A plan saved before v2 (the old sample household, exactly as v1 stored it). */
const V1_SAMPLE = {
  version: 1, zip: "11746", scenarioDays: 90, adults: 2, childrenAges: [2, 4], elderlyOrMobility: false, toddlerNeeds: ["diapers"],
  pets: [{ type: "dog", count: 1, size: "medium", specialDiet: false, medications: false }], hasPrescriptions: false, poweredDevices: [],
  homeType: "house", floors: 2, hasBasement: true, hasGarage: true, hasYard: true, heatSources: ["natural_gas"], cooking: "gas",
  waterSource: "municipal", hasFiltration: false, backupPower: "none", vehicleFuels: ["gas", "gas"], storage: ["garage", "basement"],
  evacuation: { mode: "fallback", locationType: "raw_land", distanceMiles: 120 }, budget: "1500_5000", skills: [],
};

describe("answers v1 → v2 (D4, D5, D6)", () => {
  it("shelter in place becomes 'stay home' with no destination yet", () => {
    const m = migrateAnswers({ ...V1_SAMPLE, evacuation: { mode: "shelter_only" } }) as Record<string, unknown>;
    expect(m.approach).toBe("stay_home");
    expect(m.evacuation).toEqual({ destination: "not_sure" });
    expect(m.version).toBe(ANSWERS_VERSION);
  });
  it("a fallback location becomes the destination with its distance", () => {
    const m = migrateAnswers(V1_SAMPLE) as Record<string, unknown>;
    expect(m.evacuation).toEqual({ destination: "raw_land", distanceMiles: 120 });
    expect(m.approach).toBe("another_property");
    const ff = migrateAnswers({ ...V1_SAMPLE, evacuation: { mode: "fallback", locationType: "friends_family", distanceMiles: 50 } }) as Record<string, unknown>;
    expect(ff.approach).toBe("family_friends");
  });
  it("the filter yes/no becomes household / none", () => {
    expect((migrateAnswers({ ...V1_SAMPLE, hasFiltration: true }) as Record<string, unknown>).waterFilter).toBe("household");
    const m = migrateAnswers(V1_SAMPLE) as Record<string, unknown>;
    expect(m.waterFilter).toBe("none");
    expect("hasFiltration" in m).toBe(false);
  });
  it("a shed used for storage is a shed the home has", () => {
    expect((migrateAnswers({ ...V1_SAMPLE, storage: ["shed"] }) as Record<string, unknown>).hasShed).toBe(true);
    expect((migrateAnswers(V1_SAMPLE) as Record<string, unknown>).hasShed).toBe(false);
  });
  it("is idempotent", () => {
    const once = migrateAnswers(V1_SAMPLE);
    expect(migrateAnswers(once)).toEqual(once);
  });
  it("old saved answers parse and still build a plan, with the same ticks for steps that didn't change", async () => {
    const parsed = AnswersSchema.parse(V1_SAMPLE);
    expect(parsed.version).toBe(2);
    const r = await buildPlan(V1_SAMPLE);
    expect(r.computed.evacuation?.distanceMiles).toBe(120);
    const ids = r.document.sections.flatMap((s) => s.blocks).flatMap((b) => (b.type === "checklist" ? b.items.map((i) => i.id) : []));
    expect(ids).toContain("month-approach");
    expect(new Set(ids).size).toBe(ids.length); // no duplicate checklist ids
  });
});

describe("storage follows the home (D5)", () => {
  it("offers only the spaces the home has, plus indoor options", () => {
    expect(storageOptions({ hasGarage: false, hasBasement: false, hasShed: false })).toEqual(["closets", "other_indoor", "limited", "none"]);
    expect(storageOptions({ hasGarage: true, hasBasement: false, hasShed: true })).toEqual(["garage", "shed", "closets", "other_indoor", "limited", "none"]);
  });
  it("very limited and no suitable storage stand alone", () => {
    expect(AnswersSchema.safeParse({ ...V1_SAMPLE, storage: ["closets", "none"] }).success).toBe(false);
    expect(AnswersSchema.safeParse({ ...V1_SAMPLE, storage: ["none"] }).success).toBe(true);
  });
  it("a drive destination needs a distance", () => {
    const v2 = migrateAnswers(V1_SAMPLE) as Record<string, unknown>;
    expect(AnswersSchema.safeParse({ ...v2, evacuation: { destination: "hotel" } }).success).toBe(false);
    expect(AnswersSchema.safeParse({ ...v2, evacuation: { destination: "public_shelter" } }).success).toBe(true);
  });
});
