import type { ReactNode } from "react";

/**
 * Visual calm pass (item 5): the one component for errors and notices. A soft tinted box, a small icon, plain text
 * at body size, and a real "Try again" button where retrying makes sense. docs/DESIGN.md: errors use the warn tint,
 * never red (red is for safety warnings), and say what happened and what to do (lib/errors.ts).
 * `size="sm"` is for a message under a single field or box. Server-safe: no hooks.
 */
export type NoticeTone = "error" | "info" | "success";

const TONE: Record<NoticeTone, { box: string; icon: string; role: "alert" | "status" }> = {
  error: { box: "bg-warn-soft", icon: "text-warn", role: "alert" },
  info: { box: "bg-brand-soft", icon: "text-brand", role: "status" },
  success: { box: "bg-ok-soft", icon: "text-ok", role: "status" },
};

function NoticeIcon({ tone }: { tone: NoticeTone }) {
  const d = {
    // a circle with a short line and a dot: "something needs a look"
    error: "M12 7.5v5.5M12 16.5h.01",
    info: "M12 11v5.5M12 7.5h.01",
    success: "M8 12.5l2.7 2.7L16 9.5",
  }[tone];
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={`mt-0.5 size-5 shrink-0 ${TONE[tone].icon}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d={d} />
    </svg>
  );
}

export function Notice({
  tone = "info",
  children,
  action,
  size = "md",
  id,
  className = "",
  live = true,
  testId,
}: {
  tone?: NoticeTone;
  children: ReactNode;
  /** A real retry: shown as a button under the text. */
  action?: { label: string; onClick: () => void; disabled?: boolean };
  size?: "md" | "sm";
  id?: string;
  className?: string;
  /** false for a notice that's on the page from the start (not announced as it appears). */
  live?: boolean;
  testId?: string;
}) {
  const t = TONE[tone];
  return (
    <div
      id={id}
      role={live ? t.role : undefined}
      data-notice={tone}
      data-testid={testId}
      className={`flex gap-2.5 rounded-lg ${t.box} ${size === "sm" ? "mt-1.5 px-2.5 py-2 text-sm" : "px-3 py-3"} ${className}`}
    >
      <NoticeIcon tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="text-ink">{children}</div>
        {action && (
          <button type="button" className="btn-ghost mt-2 text-sm px-3 min-h-[44px]" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
