import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

/** Migrations are applied 0001 onward, in order (README deploy checklist; CI job "store-postgres"). */
describe("supabase/migrations", () => {
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  it("are numbered 0001, 0002, … with no gaps or duplicates", () => {
    expect(files.map((f) => f.slice(0, 4))).toEqual(files.map((_, i) => String(i + 1).padStart(4, "0")));
    for (const f of files) expect(f).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
  });
  it("the README deploy checklist names the last migration", () => {
    expect(readFileSync("README.md", "utf8")).toContain(files.at(-1)!.replace(/\.sql$/, ""));
  });
});
