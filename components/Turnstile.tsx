"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "error-callback"?: () => void }) => string };
  }
}

/** Cloudflare Turnstile widget; renders nothing when no site key is configured (dev/demo). */
export function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const el = ref.current;
    const render = () => window.turnstile?.render(el, { sitekey: siteKey, callback: onToken });
    if (window.turnstile) return void render();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [siteKey, onToken]);
  return siteKey ? <div ref={ref} className="min-h-[65px]" /> : null;
}
