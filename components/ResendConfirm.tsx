"use client";
import { useState } from "react";

export function ResendConfirm({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function resend() {
    setState("busy");
    const r = await fetch("/api/auth/resend", { method: "POST", headers: { "Content-Type": "application/json" } });
    const j = (await r.json().catch(() => ({}))) as { error?: string; demoLink?: string };
    if (!r.ok) {
      setState("error");
      setMsg(j.error ?? "Couldn't resend. Try again shortly.");
      return;
    }
    try {
      if (j.demoLink) sessionStorage.setItem("rp_demo_link", j.demoLink);
    } catch {}
    setState("sent");
    setMsg(`Sent again to ${email}. It can take a minute; check spam or promotions too.`);
  }
  return (
    <div className="mt-2 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-muted">Sent to <strong className="break-all text-ink">{email}</strong>.</span>
      {state !== "sent" && (
        <button type="button" className="underline font-semibold" onClick={resend} disabled={state === "busy"}>
          {state === "busy" ? "Sending…" : "Didn't get it? Resend"}
        </button>
      )}
      {msg && <span role="status" className={state === "error" ? "text-warn font-medium" : ""}>{msg}</span>}
    </div>
  );
}
