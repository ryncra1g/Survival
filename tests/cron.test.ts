import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cronAuthorized } from "@/lib/server/cronAuth";

/** Low 1 (security review): the cron secret is compared in constant time, with a length check first. */
process.env.READYPLAN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rp-cron-"));
process.env.CRON_SECRET = "s3cret-value";

describe("cronAuthorized", () => {
  it("passes only the exact bearer secret", () => {
    expect(cronAuthorized("Bearer s3cret-value", "s3cret-value")).toBe(true);
    expect(cronAuthorized("Bearer s3cret-valuX", "s3cret-value")).toBe(false); // wrong, same length
    expect(cronAuthorized("Bearer s3cret", "s3cret-value")).toBe(false); // wrong length (shorter)
    expect(cronAuthorized("Bearer s3cret-value-and-more", "s3cret-value")).toBe(false); // wrong length (longer)
    expect(cronAuthorized("s3cret-value", "s3cret-value")).toBe(false); // no Bearer prefix
    expect(cronAuthorized(null, "s3cret-value")).toBe(false);
  });
  it("never passes when no secret is configured", () => {
    expect(cronAuthorized("Bearer ", "")).toBe(false);
    expect(cronAuthorized("", "")).toBe(false);
  });
  it("handles multi-byte input without throwing", () => {
    expect(cronAuthorized("Bearer s3cret-valué", "s3cret-value")).toBe(false);
  });
});

describe("GET /api/cron/emails", () => {
  let GET: (req: Request) => Promise<Response>;
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/cron/emails/route"));
  });
  const call = (auth?: string) => GET(new Request("http://test.local/api/cron/emails", { headers: auth ? { authorization: auth } : {} }));
  it("right secret passes; wrong and wrong-length secrets get 401", async () => {
    expect((await call("Bearer s3cret-value")).status).toBe(200);
    expect((await call("Bearer s3cret-valuX")).status).toBe(401);
    expect((await call("Bearer short")).status).toBe(401);
    expect((await call()).status).toBe(401);
  });
});
