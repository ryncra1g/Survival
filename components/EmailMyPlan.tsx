"use client";
import { Notice } from "./Notice";
import Link from "next/link";
import { useCallback, useState } from "react";
import { suggestEmail } from "@/lib/email/typos";
import { Turnstile } from "./Turnstile";
import { BRAND } from "@/lib/brand";
import { ERR, errorFromThrown, friendlyError } from "@/lib/errors";

type Result = { status: "sent" | "confirm"; email: string; demoLink?: string };

/**
 * Optional email capture next to the finished plan. The value exchange is the PDF, the fridge
 * checklist and a link to update the plan. Marketing (seasonal reminders) is a separate,
 * unticked checkbox, so consent is freely given (GDPR-safe).
 * `onSubmit` replaces the server call in the standalone demo.
 */
export function EmailMyPlan({ planId, siteKey = "", onSubmit, idPrefix = "emp" }: { planId: string; siteKey?: string; onSubmit?: (email: string, updates: boolean) => void; idPrefix?: string }) {
  const [email, setEmail] = useState("");
  const [updates, setUpdates] = useState(false);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Result | null>(null);
  const onToken = useCallback((t: string) => setToken(t), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError(ERR.email);
    const fix = suggestEmail(value);
    if (fix && suggestion !== fix) return setSuggestion(fix);
    if (onSubmit) {
      onSubmit(value, updates);
      return setDone({ status: "confirm", email: value });
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/plans/${planId}/claim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: value, updates, turnstileToken: token || undefined, website: website || undefined }) });
      const j = (await r.json()) as Result & { error?: string };
      if (!r.ok) throw new Error(friendlyError(r.status, j.error, ERR.save));
      setDone(j);
    } catch (err) {
      setError(errorFromThrown(err, ERR.save));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Notice tone="success">
        <p className="font-semibold">{done.status === "sent" ? "On its way" : "Almost there: check your inbox"}</p>
        <p className="mt-1 text-sm">
          {done.status === "sent"
            ? <>Your plan, PDF and fridge checklist are on their way to <strong className="break-all">{done.email}</strong>.</>
            : <>We sent a confirmation link to <strong className="break-all">{done.email}</strong>. Tap it and we&apos;ll email your plan, PDF and fridge checklist.</>}
        </p>
        {done.demoLink && <p className="mt-2 text-sm">Demo mode (no email provider): <a className="underline break-all" href={done.demoLink}>open the confirmation link</a></p>}
      </Notice>
    );

  return (
    <form onSubmit={submit} noValidate className="card p-4 sm:p-5 space-y-3 no-print" aria-labelledby={`${idPrefix}-h`}>
      <div>
        <h2 id={`${idPrefix}-h`} className="text-lg font-bold">Save my plan</h2>
        <p className="text-sm text-muted mt-1">Keep it in your inbox with the PDF and fridge checklist attached, plus a link to come back and update it. Optional.</p>
      </div>
      <label htmlFor={`${idPrefix}-email`} className="sr-only">Email</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input id={`${idPrefix}-email`} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="send" placeholder="you@example.com" className="input flex-1" value={email} onChange={(e) => { setError(""); setSuggestion(null); setEmail(e.target.value); }} />
        <button className="btn shrink-0" disabled={busy}>{busy ? "Saving…" : "Save my plan"}</button>
      </div>
      {suggestion && (
        <p role="status" className="text-sm">
          Did you mean <button type="button" className="underline font-semibold break-all" onClick={() => { setEmail(suggestion); setSuggestion(null); }}>{suggestion}</button>? <span className="text-muted">Tap it to fix, or press the button again to keep yours.</span>
        </p>
      )}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor={`${idPrefix}-website`}>Website</label>
        <input id={`${idPrefix}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="flex min-h-[44px] gap-3 items-start py-2 cursor-pointer text-sm">
        <input id={`${idPrefix}-updates`} type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" checked={updates} onChange={(e) => setUpdates(e.target.checked)} />
        <span>Also send me seasonal reminders (winter, hurricane season) and occasional preparedness updates. <span className="text-muted">Unsubscribe any time.</span></span>
      </label>
      <Turnstile siteKey={siteKey} onToken={onToken} />
      {error && <Notice tone="error">{error}</Notice>}
      <p className="text-xs text-muted">Only used for {BRAND.name}, never sold. <Link href="/privacy" className="underline">Privacy policy</Link>.</p>
    </form>
  );
}
