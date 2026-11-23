"use client";
import { useRef, useState } from "react";
import { AI_COPIED, AI_EXPLAINER } from "@/lib/plan/aiSummary";

/**
 * D12b: copy a plain-text summary for ChatGPT, Claude or Gemini. The text is built on the server from an
 * allow-list (no health details, consent records or addresses). `track` counts the click for the admin
 * dashboard (D13); the copied text itself is never sent anywhere.
 */
export function CopyForAI({ text, planId, track = true, variant = "button" }: { text: string; planId: string; track?: boolean; variant?: "button" | "menu" }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const area = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    if (track) fetch(`/api/plans/${planId}/ai-copy`, { method: "POST" }).catch(() => {});
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Clipboard blocked (older browser or permissions): show the text selected, ready to copy by hand.
      setState("manual");
      setTimeout(() => area.current?.select(), 0);
    }
  }

  const cls =
    variant === "menu"
      ? "flex w-full min-h-11 items-center rounded-md px-3 text-sm text-left hover:bg-line/40"
      : "btn-ghost border border-line text-sm px-3 min-h-[44px]";
  return (
    <div data-testid="copy-for-ai" className={variant === "menu" ? "" : "space-y-1"}>
      <button type="button" className={cls} onClick={copy}>Copy for your AI assistant</button>
      <p className={`text-xs text-muted max-w-prose ${variant === "menu" ? "px-3 pb-2" : ""}`}>{AI_EXPLAINER}</p>
      {state === "copied" && <p role="status" className="text-sm text-ok px-3">{AI_COPIED}</p>}
      {state === "manual" && (
        <div className="px-1">
          <label className="text-sm" htmlFor={`ai-copy-${variant}-${planId}`}>Copy this text, then paste it into your AI assistant:</label>
          <textarea id={`ai-copy-${variant}-${planId}`} ref={area} readOnly value={text} rows={6} className="input mt-1 w-full text-xs font-mono" />
        </div>
      )}
    </div>
  );
}
