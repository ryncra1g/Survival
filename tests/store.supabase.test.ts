import { describe, it } from "vitest";
import { storeContract } from "./helpers/storeContract";

/**
 * The same store contract against the Supabase store on a real Postgres: the Supabase CLI local stack (Postgres +
 * PostgREST + Storage), started in the CI job "store-postgres" with every migration applied in order.
 * Skipped in a plain `npm test` (no database). The CI job sets REQUIRE_SUPABASE_TEST=1, so it can't skip there.
 *   SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_SERVICE_KEY=... npx vitest run tests/store.supabase.test.ts
 */
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_KEY;
if (process.env.REQUIRE_SUPABASE_TEST === "1" && (!url || !key)) throw new Error("REQUIRE_SUPABASE_TEST=1 but SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_KEY are not set");
// The contract empties the gear catalog and deletes anonymous questionnaires: never point it at a real project.
if (url && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname))
  throw new Error(`Refusing to run the store contract against ${new URL(url).hostname}: local Supabase stacks only (127.0.0.1 / localhost)`);

if (!url || !key) {
  describe.skip("Store contract: Supabase on Postgres (set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_KEY)", () => {
    it("runs in CI only", () => {});
  });
} else {
  // Set before the store (and lib/server/env) is imported: they read the environment once.
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  storeContract("Supabase on Postgres", async () => (await import("@/lib/server/store/supabase")).supabaseStore);
}
