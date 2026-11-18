import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name}: your emergency plan and supply list, built for your home in 5 minutes`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview for Facebook, Nextdoor, iMessage, X, etc. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f6f3ee", color: "#1c2430", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "#b3471d", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: 700 }}>R</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#b3471d" }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Your emergency plan, built for your home in 5 minutes</div>
          <div style={{ fontSize: 34, color: "#5b6573" }}>Exact water, food and fuel amounts · a week-by-week checklist · free, no sign-up</div>
        </div>
      </div>
    ),
    size,
  );
}
