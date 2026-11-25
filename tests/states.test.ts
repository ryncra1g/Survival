import { describe, expect, it } from "vitest";
import { areaName, STATE_NAME } from "@/lib/zip/states";
import { lookupZip } from "@/lib/zip/profile";

describe("area name (UX-17)", () => {
  it("a statewide region shows once; a smaller region keeps its state", () => {
    expect(areaName("Ohio", "OH")).toBe("Ohio");
    expect(areaName("Long Island", "NY")).toBe("Long Island, NY");
    const oh = lookupZip("43215");
    expect(areaName(oh.region, oh.state)).toBe("Ohio");
  });
  it("knows the state of every named household ZIP", () => {
    for (const zip of ["43215", "60614", "04101", "85004", "95969", "70112", "30310", "80302", "11746", "98115"]) expect(STATE_NAME[lookupZip(zip).state], zip).toBeTruthy();
  });
});
