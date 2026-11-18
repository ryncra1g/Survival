import { z } from "zod";
import { CatalogItemSchema } from "@/lib/catalog/types";
import { err, json, readJson, requireAdmin, sameOrigin } from "@/lib/server/http";
import { store } from "@/lib/server/store";

export async function GET() {
  if (!(await requireAdmin())) return err("Forbidden", 403);
  return json({ items: await store.listCatalog() });
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  if (!(await requireAdmin())) return err("Forbidden", 403);
  const item = CatalogItemSchema.safeParse(await readJson(req));
  if (!item.success) return err(item.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  if (item.data.priceHigh < item.data.priceLow) return err("priceHigh must be ≥ priceLow");
  await store.upsertCatalogItem(item.data);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return err("Bad origin", 403);
  if (!(await requireAdmin())) return err("Forbidden", 403);
  const body = z.object({ id: z.string() }).safeParse(await readJson(req));
  if (!body.success) return err("Missing id");
  await store.deleteCatalogItem(body.data.id);
  return json({ ok: true });
}
