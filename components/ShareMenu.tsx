"use client";
import { useEffect, useRef, useState } from "react";

/**
 * D9 / PL-04: Share / Download / Print menu in the plan header.
 * Save my plan · Download PDF · Fridge checklist · Print · Copy for your AI assistant (+ calendar when given).
 * None of these need an email.
 */
export function ShareMenu({ planId, email = true, extra }: { planId: string; email?: boolean; extra?: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (focus: boolean) => {
      if (ref.current) ref.current.open = false;
      if (focus) ref.current?.querySelector("summary")?.focus();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);
  const item = "flex w-full min-h-11 items-center rounded-md px-3 text-sm text-left hover:bg-line/40";
  return (
    <details ref={ref} className="relative no-print" data-testid="share-menu" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary aria-expanded={open} className="list-none cursor-pointer btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center gap-2 [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
        Share, download or print
      </summary>
      <div role="group" aria-label="Share, download or print" className="absolute left-0 top-full mt-1 z-40 w-72 card p-1 shadow-lg">
        {email && <a href="#email" className={item} onClick={() => ref.current && (ref.current.open = false)}>Save my plan</a>}
        <a href={`/api/plans/${planId}/pdf`} className={item}>Download PDF</a>
        <a href={`/api/plans/${planId}/checklist`} className={item}>Fridge checklist</a>
        <button type="button" className={item} onClick={() => window.print()}>Print</button>
        {extra}
      </div>
    </details>
  );
}
