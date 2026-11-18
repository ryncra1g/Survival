import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/sample", "/privacy", "/terms"], disallow: ["/plan/", "/q/", "/admin", "/account", "/api/", "/go/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
