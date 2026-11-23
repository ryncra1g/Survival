"use client";
import { useState } from "react";
import { PLACES_NOT_SAVED } from "@/lib/copy";

/**
 * D4 (launch): type a backup destination and print it. Nothing is saved or sent: the fields have no
 * name, there is no form submit, and nothing here calls the server. Directions open a maps app only
 * when tapped. No embedded map. The address is never used in emails, analytics or AI.
 */
export function PlacesForm() {
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const q = encodeURIComponent(address.trim());
  return (
    <div className="space-y-4">
      <div className="no-print space-y-3" data-testid="places-form">
        <label className="block">
          <span className="text-sm font-semibold">Place</span>
          <input className="input mt-1 w-full" autoComplete="off" placeholder="e.g. Aunt Rosa's house" value={place} onChange={(e) => setPlace(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Address</span>
          <input className="input mt-1 w-full" autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Notes (route, phone, key)</span>
          <input className="input mt-1 w-full" autoComplete="off" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <p className="text-sm text-muted" role="note">{PLACES_NOT_SAVED}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn text-sm px-4 min-h-[44px]" onClick={() => window.print()} disabled={!address.trim()}>Print</button>
          {address.trim() && (
            <>
              <a className="btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center" href={`https://maps.apple.com/?daddr=${q}`} target="_blank" rel="noopener noreferrer">Directions (Apple Maps)</a>
              <a className="btn-ghost border border-line text-sm px-3 min-h-[44px] inline-flex items-center" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener noreferrer">Directions (Google Maps)</a>
            </>
          )}
        </div>
      </div>
      {/* The printed page: large type, one per go-bag. */}
      <section className="hidden print:block" data-testid="places-print">
        <h2 className="text-3xl font-bold">If we have to leave, we go to:</h2>
        <p className="mt-4 text-2xl font-semibold">{place || "Our backup destination"}</p>
        <p className="mt-2 text-2xl">{address}</p>
        {notes && <p className="mt-2 text-xl">{notes}</p>}
        <p className="mt-6 text-lg">Official evacuation orders override this plan.</p>
      </section>
    </div>
  );
}
