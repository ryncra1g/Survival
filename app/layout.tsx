import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ReadyPlan — your family's emergency plan", template: "%s · ReadyPlan" },
  description: "A personalized emergency plan and supply list for your home, built in about 5 minutes.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#b3471d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 btn">Skip to content</a>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-brand">ReadyPlan</Link>
            <nav className="text-sm flex gap-4">
              <Link href="/account" className="underline-offset-4 hover:underline">My plan</Link>
            </nav>
          </div>
        </header>
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-line text-sm text-muted">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-2">
            <p>General preparedness guidance, not professional advice. Follow official instructions in an emergency. Prices and products change.</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/privacy" className="underline">Privacy</Link>
              <Link href="/terms" className="underline">Terms</Link>
              <Link href="/account" className="underline">Export or delete my data</Link>
              <a href="https://www.ready.gov" className="underline" rel="noopener">Ready.gov</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
