"use client";
import { useEffect, useRef } from "react";
import { saveBarText } from "@/lib/copy";
import { EmailMyPlan } from "./EmailMyPlan";

/**
 * D9: one slim visitor bar instead of the big email box. Tapping it opens the same email form
 * (claim API, Turnstile, honeypot, unticked marketing box). The Share menu's "Email me my plan" links to #email.
 */
export function SaveBar({ planId, siteKey = "", accounts = false, onSubmit }: { planId: string; siteKey?: string; accounts?: boolean; onSubmit?: (email: string, updates: boolean) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const openIfAsked = () => {
      if (window.location.hash === "#email" && ref.current) {
        ref.current.open = true;
        ref.current.querySelector<HTMLInputElement>("input[type=email]")?.focus();
      }
    };
    openIfAsked();
    window.addEventListener("hashchange", openIfAsked);
    return () => window.removeEventListener("hashchange", openIfAsked);
  }, []);
  return (
    <details ref={ref} id="email" data-testid="save-bar" className="group no-print scroll-mt-20">
      <summary className="list-none cursor-pointer card px-4 py-3 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="text-sm">{saveBarText(accounts)}</span>
        <span className="btn shrink-0 text-sm px-3 min-h-[44px] group-open:hidden">Confirm email</span>
      </summary>
      <div className="mt-2">
        <EmailMyPlan planId={planId} siteKey={siteKey} onSubmit={onSubmit} />
      </div>
    </details>
  );
}
