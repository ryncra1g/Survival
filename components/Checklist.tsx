"use client";
import { useEffect, useState } from "react";

/** Checkboxes persist per plan in this browser (convenience only). */
export function Checklist({ planId, items }: { planId: string; items: { id: string; text: string }[] }) {
  const key = `rp_checks_${planId}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {}
  }, [key]);
  const toggle = (id: string) => {
    setDone((prev) => {
      let all: Record<string, boolean> = {};
      try {
        all = JSON.parse(localStorage.getItem(key) ?? "{}");
      } catch {}
      const next = { ...all, ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  return (
    <ul className="my-3 space-y-1">
      {items.map((it) => (
        <li key={it.id}>
          <label className="flex gap-3 items-start py-1 cursor-pointer">
            <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--brand)]" checked={!!done[it.id]} onChange={() => toggle(it.id)} />
            <span className={done[it.id] ? "line-through text-muted" : ""}>{it.text}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
