import { describe, expect, it } from "vitest";
import { flags, flagOn, NO_FLAGS } from "@/lib/flags";

describe("feature flags", () => {
  it("are off by default", () => {
    expect(flags({})).toEqual({ accounts: false, diyTips: false });
    expect(NO_FLAGS).toEqual({ accounts: false, diyTips: false });
  });
  it("turn on only for the exact value 'true'", () => {
    for (const v of ["1", "yes", "TRUE", "True", " true", "on", ""]) expect(flagOn(v)).toBe(false);
    expect(flags({ ACCOUNTS_ENABLED: "true" })).toEqual({ accounts: true, diyTips: false });
    expect(flags({ DIY_TIPS_ENABLED: "true" })).toEqual({ accounts: false, diyTips: true });
  });
  it("are off in the test environment (defaults never flipped)", () => {
    expect(flags()).toEqual({ accounts: false, diyTips: false });
  });
});
