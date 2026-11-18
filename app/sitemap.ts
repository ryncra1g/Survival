import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "http://localhost:3000";
  return ["", "/sample", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}`, changeFrequency: p ? "monthly" : "weekly", priority: p ? 0.5 : 1 }));
}
