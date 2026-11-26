"use client";
import { Notice } from "./Notice";
import { ERR } from "@/lib/errors";
import { useEffect, useRef, useState } from "react";
import { INVENTORY_STATUS, type Inventory, type InventoryEntry } from "@/lib/accountData";

type Item = { itemId: string; name: string; qty: number };
const LABEL: Record<InventoryEntry["status"], string> = { have: "Have", need: "Need", bought: "Bought", low: "Running low" };

/**
 * D2 inventory (accounts track): have / need / bought / low, quantity and an optional expiry date for
 * each item in the plan. Saves to the plan (encrypted) a moment after each change.
 */
export function InventoryEditor({ planId, items, initial, accounts }: { planId: string; items: Item[]; initial: Inventory; accounts: boolean }) {
  const [inv, setInv] = useState<Inventory>(initial);
  const [state, setState] = useState<"idle" | "saved" | "saving" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/plans/${planId}/inventory`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventory: inv }) }).catch(() => null);
      setState(r?.ok ? "saved" : "error");
    }, 500);
  }, [inv, planId]);

  const set = (id: string, patch: Partial<InventoryEntry>) =>
    setInv((cur) => ({ ...cur, [id]: { ...(cur[id] ?? { status: "need" }), ...patch } as InventoryEntry }));

  return (
    <div data-testid="inventory">
      {state === "error" ? (
        <Notice tone="error" action={{ label: "Try again", onClick: () => setInv((c) => ({ ...c })) }}>{ERR.save}</Notice>
      ) : (
        <p className="text-sm text-muted" role="status">{state === "saving" ? "Saving…" : state === "saved" && accounts ? "Saved." : ""}</p>
      )}
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {items.map((it) => {
          const e = inv[it.itemId];
          return (
            <li key={it.itemId} id={it.itemId} className="py-3 scroll-mt-20" data-item={it.itemId}>
              <p className="font-semibold">{it.name} <span className="text-muted font-normal">× {it.qty}</span></p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  <span className="sr-only">{it.name}: status</span>
                  <select className="input min-h-[44px]" value={e?.status ?? "need"} onChange={(ev) => set(it.itemId, { status: ev.target.value as InventoryEntry["status"] })} aria-label={`${it.name}: status`}>
                    {INVENTORY_STATUS.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-muted">How many</span>
                  <input className="input w-24 min-h-[44px]" type="number" inputMode="numeric" min={0} value={e?.qty ?? ""} onChange={(ev) => set(it.itemId, { qty: ev.target.value === "" ? undefined : Math.max(0, Math.floor(Number(ev.target.value))) })} aria-label={`${it.name}: how many`} />
                </label>
                <label className="text-sm">
                  <span className="block text-muted">Expires (optional)</span>
                  <input className="input min-h-[44px]" type="date" value={e?.expiresOn ?? ""} onChange={(ev) => set(it.itemId, { expiresOn: ev.target.value || undefined })} aria-label={`${it.name}: expires`} />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
