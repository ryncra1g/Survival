"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Turnstile } from "./Turnstile";

export function SignupForm({ siteKey }: { siteKey: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onToken = useCallback((t: string) => setToken(t), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!consent) return setError("Please tick the box so we can send your plan.");
    setBusy(true);
    const r = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent, turnstileToken: token || undefined, website: website || undefined }) });
    const j = (await r.json().catch(() => ({}))) as { questionnaireId?: string; error?: string; demoLink?: string };
    setBusy(false);
    if (!r.ok || !j.questionnaireId) return setError(j.error ?? "Something went wrong. Try again.");
    try {
      if (j.demoLink) sessionStorage.setItem("rp_demo_link", j.demoLink);
    } catch {}
    router.push(`/q/${j.questionnaireId}`);
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block font-semibold">Email</label>
        <p id="email-help" className="text-sm text-muted">We&apos;ll send your plan and a link to come back and edit it.</p>
        <input id="email" type="email" inputMode="email" autoComplete="email" required className="input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="email-help" />
      </div>
      {/* Honeypot: hidden from people, bots fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="flex gap-3 items-start cursor-pointer">
        <input type="checkbox" className="mt-1 size-5 accent-[var(--brand)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>Send me my plan and occasional preparedness updates. <span className="text-muted text-sm">Unsubscribe any time. See our <Link href="/privacy" className="underline">privacy policy</Link>.</span></span>
      </label>
      <Turnstile siteKey={siteKey} onToken={onToken} />
      {error && <p role="alert" className="text-danger font-medium">{error}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Starting…" : "Start my plan"}</button>
      <p className="text-xs text-muted">We&apos;ll email you a link to confirm your address. Your plan appears on screen right away.</p>
    </form>
  );
}
