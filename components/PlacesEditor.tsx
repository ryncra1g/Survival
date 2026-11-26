"use client";
import { Notice } from "./Notice";
import { ERR } from "@/lib/errors";
import { useState } from "react";
import type { Place } from "@/lib/accountData";

/**
 * D4 My places (accounts track): backup destinations saved to a confirmed account, encrypted.
 * Never used in emails, analytics or AI. Directions open a maps app only when tapped; no embedded map.
 * A distance (the person's own estimate) can update the plan's evacuation fuel math when they rebuild.
 */
export function PlacesEditor({ initial }: { initial: Place[] }) {
  const [places, setPlaces] = useState<Place[]>(initial.length ? initial : [{ id: "p1", name: "", address: "" }]);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const update = (i: number, patch: Partial<Place>) => setPlaces((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  async function save() {
    setState("saving");
    const clean = places.filter((p) => p.name.trim() && p.address.trim());
    const r = await fetch("/api/account/places", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: clean }) }).catch(() => null);
    setState(r?.ok ? "saved" : "error");
  }
  return (
    <div className="space-y-4" data-testid="places-editor">
      {places.map((p, i) => {
        const q = encodeURIComponent(p.address.trim());
        return (
          <fieldset key={p.id} className="card p-4 space-y-2 print:border-0">
            <legend className="sr-only">Place {i + 1}</legend>
            <label className="block no-print"><span className="text-sm font-semibold">Place</span><input className="input mt-1 w-full" value={p.name} onChange={(e) => update(i, { name: e.target.value })} /></label>
            <label className="block no-print"><span className="text-sm font-semibold">Address</span><input className="input mt-1 w-full" value={p.address} onChange={(e) => update(i, { address: e.target.value })} /></label>
            <label className="block no-print"><span className="text-sm font-semibold">Notes (route, phone, key)</span><input className="input mt-1 w-full" value={p.notes ?? ""} onChange={(e) => update(i, { notes: e.target.value || undefined })} /></label>
            <label className="block no-print"><span className="text-sm font-semibold">About how far, in miles (optional)</span><input className="input mt-1 w-32" type="number" min={1} max={2000} value={p.distanceMiles ?? ""} onChange={(e) => update(i, { distanceMiles: e.target.value ? Math.round(Number(e.target.value)) : undefined })} /></label>
            {p.address.trim() && (
              <p className="no-print flex flex-wrap gap-2 text-sm">
                <a className="underline" href={`https://maps.apple.com/?daddr=${q}`} target="_blank" rel="noopener noreferrer">Directions (Apple Maps)</a>
                <a className="underline" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener noreferrer">Directions (Google Maps)</a>
              </p>
            )}
            <div className="hidden print:block">
              <p className="text-2xl font-semibold">{p.name}</p>
              <p className="text-2xl">{p.address}</p>
              {p.notes && <p className="text-xl">{p.notes}</p>}
            </div>
          </fieldset>
        );
      })}
      <div className="no-print flex flex-wrap gap-2">
        {places.length < 10 && <button type="button" className="btn-ghost border border-line text-sm px-3 min-h-[44px]" onClick={() => setPlaces((ps) => [...ps, { id: `p${Date.now().toString(36)}`, name: "", address: "" }])}>Add another place</button>}
        <button type="button" className="btn text-sm px-4 min-h-[44px]" onClick={save} disabled={state === "saving"}>Save my places</button>
        <button type="button" className="btn-ghost border border-line text-sm px-3 min-h-[44px]" onClick={() => window.print()}>Print</button>
      </div>
      {state === "error" ? (
        <Notice tone="error" className="no-print" action={{ label: "Try again", onClick: () => void save() }}>{ERR.save}</Notice>
      ) : (
        <p role="status" className="text-sm text-muted no-print">{state === "saved" ? "Saved to your account." : ""}</p>
      )}
      <p className="hidden print:block text-lg">Official evacuation orders override this plan.</p>
    </div>
  );
}
