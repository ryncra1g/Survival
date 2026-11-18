import { describe, expect, it } from "vitest";
import { suggestEmail } from "@/lib/email/typos";

describe("email typo suggestions", () => {
  it.each([
    ["dana@gmial.com", "dana@gmail.com"],
    ["dana@gmail.con", "dana@gmail.com"],
    ["dana@yaho.com", "dana@yahoo.com"],
    ["dana@hotmial.com", "dana@hotmail.com"],
    ["dana@outlok.com", "dana@outlook.com"],
    ["dana@icloud.co", "dana@icloud.com"],
  ])("%s → %s", (input, out) => expect(suggestEmail(input)).toBe(out));
  it.each(["dana@gmail.com", "ray@smallbiz.org", "hank@montana-ranch.net", "x@uni.edu", "not an email"])("leaves %s alone", (e) => expect(suggestEmail(e)).toBeNull());
});
