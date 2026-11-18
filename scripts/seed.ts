/**
 * Seed the Supabase gear catalog from lib/catalog/seed.ts (upsert; safe to re-run).
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { catIn } from "@/lib/catalog/db";
import { SEED_CATALOG } from "@/lib/catalog/seed";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const { error } = await sb.from("gear_catalog").upsert(SEED_CATALOG.map(catIn));
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Seeded ${SEED_CATALOG.length} catalog items.`);
