import { describe, expect, it } from "vitest";
import { deviceSentence } from "@/lib/plan/build";

describe("device sentence (UX-19)", () => {
  it("joins with and, lower-cases names, keeps acronyms, and the verb agrees", () => {
    expect(deviceSentence(["oxygen"])).toBe("Your oxygen concentrator needs");
    expect(deviceSentence(["oxygen", "cpap"])).toBe("Your oxygen concentrator and CPAP/BiPAP need");
    expect(deviceSentence(["cpap", "nebulizer", "other"])).toBe("Your CPAP/BiPAP, nebulizer and other powered device need");
  });
});
