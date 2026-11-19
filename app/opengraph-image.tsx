import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name}: know exactly what to do when the power goes out`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview for Facebook, Nextdoor, iMessage, X, etc. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f4f5f2", color: "#14202c", fontFamily: "sans-serif", borderTop: "14px solid #c97407" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "#1e3a5c", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: 700 }}>{BRAND.name.charAt(0).toUpperCase()}</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#1e3a5c" }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>Know exactly what to do when the power goes out</div>
          <div style={{ fontSize: 34, color: "#4a5663" }}>A plan built for your home in 5 minutes · exact water, food and fuel · free, no sign-up</div>
        </div>
      </div>
    ),
    size,
  );
}
