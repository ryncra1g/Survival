import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { SiteMenu } from "@/components/SiteMenu";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — your emergency plan`, template: `%s · ${BRAND.name}` },
  description: "Get what you need. Know what to do. A free emergency plan built for your household: water, food and fuel amounts worked out for you, what to buy first and how to stay ready.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `Get what you need. Know what to do. · ${BRAND.name}`,
    description: "Amounts worked out for your household, with the math shown: water, food and fuel, a week-by-week checklist and steps for your area's hazards. Free, no sign-up.",
  },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1319" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 btn">Skip to content</a>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="tap font-bold text-lg text-brand">{BRAND.name}</Link>
            <SiteMenu />
          </div>
        </header>
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-line text-sm text-muted">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-2">
            <p>General preparedness guidance, not professional advice. Follow official instructions in an emergency. Prices and products change.</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/privacy" className="tap -mx-2 px-2 underline">Privacy</Link>
              <Link href="/terms" className="tap -mx-2 px-2 underline">Terms</Link>
              <Link href="/sources" className="tap -mx-2 px-2 underline">Sources &amp; safety</Link>
              <Link href="/account#data" className="tap -mx-2 px-2 underline">Export or delete my data</Link>
              <a href="https://www.ready.gov" className="tap -mx-2 px-2 underline" rel="noopener">Ready.gov</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
