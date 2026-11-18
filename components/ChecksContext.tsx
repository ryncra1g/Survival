"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Ctx = { checks: Record<string, boolean>; toggle: (id: string) => void };
const ChecksCtx = createContext<Ctx | null>(null);

/**
 * One shared tick store per plan. Ticks are saved in this browser and, when `sync` is on,
 * to the plan itself (PUT /api/plans/<id>/checks) so they follow the person to any device.
 */
export function ChecksProvider({ planId, initial = {}, sync = false, children }: { planId: string; initial?: Record<string, boolean>; sync?: boolean; children: React.ReactNode }) {
  const key = `rp_checks_${planId}`;
  const [checks, setChecks] = useState<Record<string, boolean>>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sync) return; // the server copy is the source of truth
    try {
      setChecks((prev) => ({ ...JSON.parse(localStorage.getItem(key) ?? "{}"), ...prev }));
    } catch {}
  }, [key, sync]);

  const toggle = useCallback(
    (id: string) => {
      setChecks((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        if (sync) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            fetch(`/api/plans/${planId}/checks`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checks: next }) }).catch(() => {});
          }, 400);
        }
        return next;
      });
    },
    [key, planId, sync],
  );
  return <ChecksCtx.Provider value={{ checks, toggle }}>{children}</ChecksCtx.Provider>;
}

export function useChecks(): Ctx {
  const c = useContext(ChecksCtx);
  if (!c) throw new Error("Checklist must be inside ChecksProvider");
  return c;
}
