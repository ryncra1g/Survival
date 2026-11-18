"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { suggestEmail } from "@/lib/email/typos";
import { Turnstile } from "./Turnstile";

/**
 * Step 1: email + consent, then straight into the questions.
 * Real <form> posting to /api/start, so it still works if JavaScript hasn't loaded.
 * `onStart` replaces the server call in the standalone demo.
 */
export function EmailStart({ siteKey = "", initialError = "", onStart, sampleLink }: { siteKey?: string; initialError?: string; onStart?: (email: string) => void; sampleLink?: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const onToken = useCallback((t: string) => setToken(t), []);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!consent) return setError("Tick the box so we can send your plan.");
    const fix = suggestEmail(email);
    if (fix && suggestion !== fix) {
      setSuggestion(fix);
      return; // ask once; submitting again keeps what they typed
    }
    if (onStart) return onStart(email.trim());
    setBusy(true);
    try {
      const r = await fetch("/api/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), consent: true, turnstileToken: token || undefined, website: website || undefined }) });
      const j = (await r.json()) as { questionnaireId?: string; error?: string; demoLink?: string; returning?: boolean };
      if (!r.ok || !j.questionnaireId) throw new Error(j.error ?? "Something went wrong. Try again.");
      try {
        if (j.demoLink) sessionStorage.setItem("rp_demo_link", j.demoLink);
        else sessionStorage.removeItem("rp_demo_link");
        if (j.returning) sessionStorage.setItem("rp_returning", "1");
        else sessionStorage.removeItem("rp_returning");
      } catch {}
      router.push(`/q/${j.questionnaireId}`);
    } catch (err) {
      setBusy(false);
      setError((err as Error).message);
    }
  }

  return (
    <form id="start" action="/api/start" method="post" onSubmit={submit} noValidate className="card p-4 sm:p-5 space-y-4 scroll-mt-4">
      <div>
        <label htmlFor="start-email" className="block font-semibold">Your email</label>
        <p id="start-email-help" className="text-sm text-muted">We&apos;ll send your plan, a printable PDF and a link to update it. Only used for ReadyPlan, never sold.</p>
        <input id="start-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="go" placeholder="you@example.com" required className="input mt-2" value={email} onChange={(e) => { setError(""); setSuggestion(null); setEmail(e.target.value); }} aria-describedby="start-email-help" />
        {suggestion && (
          <p role="status" className="mt-2 text-sm">
            Did you mean <button type="button" className="underline font-semibold break-all" onClick={() => { setEmail(suggestion); setSuggestion(null); }}>{suggestion}</button>? <span className="text-muted">Tap it to fix, or press the button again to keep yours.</span>
          </p>
        )}
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="flex gap-3 items-start cursor-pointer">
        <input id="start-consent" name="consent" type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--brand)]" checked={consent} onChange={(e) => { setError(""); setConsent(e.target.checked); }} required />
        <span>Send me my plan and occasional preparedness updates. <span className="text-sm text-muted">Unsubscribe any time. <Link href="/privacy" className="underline">Privacy policy</Link>.</span></span>
      </label>
      <Turnstile siteKey={siteKey} onToken={onToken} />
      {error && <p role="alert" className="text-danger font-medium">{error}</p>}
      <button className="btn w-full text-lg" disabled={busy}>{busy ? "Starting…" : "Build my free plan"}</button>
      <p className="text-sm text-muted text-center">Free · About 5 minutes · {sampleLink ?? <Link href="/sample" className="underline">See a sample plan first</Link>}</p>
    </form>
  );
}
