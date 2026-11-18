import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { store } from "@/lib/server/store";
import { CatalogEditor } from "./editor";
import { adminOrNotFound } from "../guard";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  await adminOrNotFound();
  const items = await store.listCatalog();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Gear catalog</h1>
      <p className="text-muted mt-1">Specs first, models second. Items not reviewed in {DEFAULT_CONSTANTS.catalog.staleAfterDays} days are hidden from new plans until re-reviewed.</p>
      <CatalogEditor initial={items} staleDays={DEFAULT_CONSTANTS.catalog.staleAfterDays} today={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
