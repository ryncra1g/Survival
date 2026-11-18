import { NextResponse } from "next/server";
import { buyUrl, isAmazon } from "@/lib/affiliate";
import { loadConstants } from "@/lib/server/config";
import { env } from "@/lib/server/env";
import { getSession } from "@/lib/server/session";
import { store } from "@/lib/server/store";

/**
 * Tracked Buy link. Counts the click (email_events type "affiliate_click", provider_id = item id)
 * and redirects to the item's affiliate URL or an Amazon search with the Associates tag.
 * Only catalog destinations are possible, so this can't be used as an open redirect.
 */
export async function GET(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const [item, { constants }] = await Promise.all([store.listCatalog().then((c) => c.find((i) => i.id === itemId)), loadConstants()]);
  const dest = item ? buyUrl(item, constants.affiliate.amazonTag) : null;
  if (!dest) return NextResponse.redirect(new URL("/", env.appUrl), 302);
  const url = new URL(req.url);
  const src = url.searchParams.get("src") === "email" ? "email" : "web";
  // Defence in depth: never send email traffic to Amazon (not allowed by the Associates agreement).
  if (src === "email" && isAmazon(dest)) {
    const p = url.searchParams.get("p");
    return NextResponse.redirect(new URL(p && /^[0-9a-f-]{36}$/i.test(p) ? `/plan/${p}#priorities` : "/account", env.appUrl), 302);
  }
  const session = await getSession().catch(() => null);
  await store.addEmailEvent({ user_id: session?.uid || null, type: "affiliate_click", provider_id: itemId, sent_at: new Date().toISOString() }).catch(() => {});
  const res = NextResponse.redirect(dest, 302);
  res.headers.set("X-Robots-Tag", "noindex");
  res.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  res.headers.set("X-Kinready-Source", src);
  return res;
}
