"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const post = (url: string, body?: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

export function EditAnswersButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn" disabled={busy} onClick={async () => {
      setBusy(true);
      const r = await post("/api/questionnaire");
      const j = (await r.json()) as { questionnaireId?: string };
      if (j.questionnaireId) router.push(`/q/${j.questionnaireId}`);
      else setBusy(false);
    }}>{busy ? "Opening…" : "Edit answers & regenerate"}</button>
  );
}

export function FollowupToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <label className="flex gap-3 items-start cursor-pointer">
      <input type="checkbox" className="mt-1 size-5 accent-[var(--brand)]" checked={on} onChange={async (e) => {
        const v = e.target.checked;
        setOn(v);
        await post("/api/account/prefs", { followups: v });
      }} />
      <span>Send me occasional reminders (day 3, day 30, and seasonal checks for my area).</span>
    </label>
  );
}

export function DeleteData() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button className="btn-ghost text-danger" onClick={() => setConfirming(true)}>Delete my data</button>;
  return (
    <div className="card p-4 border-danger space-y-3">
      <p>This permanently deletes your account, answers, plans and email history. It can&apos;t be undone.</p>
      <div className="flex gap-3">
        <button className="btn bg-danger" onClick={async () => {
          await post("/api/account/delete");
          router.push("/?deleted=1");
          router.refresh();
        }}>Yes, delete everything</button>
        <button className="btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
      </div>
    </div>
  );
}

export function SignOut() {
  const router = useRouter();
  return <button className="btn-ghost" onClick={async () => { await post("/api/auth/logout"); router.refresh(); }}>Sign out</button>;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [demoLink, setDemoLink] = useState("");
  const [error, setError] = useState("");
  if (state === "sent")
    return (
      <div className="card p-4" role="status">
        <p>If there&apos;s a plan for that email, a sign-in link is on its way. It works once and expires in an hour.</p>
        {demoLink && <p className="mt-2 text-sm">Demo mode: <a className="underline break-all" href={demoLink}>open the link</a></p>}
      </div>
    );
  return (
    <form className="card p-4 space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setState("busy");
      const r = await post("/api/auth/login", { email });
      const j = (await r.json()) as { error?: string; demoLink?: string };
      if (!r.ok) {
        setError(j.error ?? "Try again");
        setState("idle");
      } else {
        setDemoLink(j.demoLink ?? "");
        setState("sent");
      }
    }}>
      <label htmlFor="login-email" className="font-semibold block">Email</label>
      <input id="login-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button className="btn w-full" disabled={state === "busy"}>Email me a sign-in link</button>
    </form>
  );
}
