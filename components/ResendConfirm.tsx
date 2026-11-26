"use client";
import { Notice } from "./Notice";
import { useState } from "react";
import { friendlyError } from "@/lib/errors";

export function ResendConfirm({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function resend() {
    setState("busy");
    const r = await fetch("/api/auth/resend", { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => null);
    const j = ((await r?.json().catch(() => ({}))) ?? {}) as { error?: string; demoLink?: string };
    if (!r?.ok) {
      setState("error");
      setMsg(friendlyError(r?.status ?? 0, j.error, "We couldn't resend it just now. Try again in a minute."));
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
      {msg && (state === "error" ? <Notice tone="error" size="sm" className="w-full" action={{ label: "Try again", onClick: () => void resend() }}>{msg}</Notice> : <span role="status">{msg}</span>)}
    </div>
  );
}
