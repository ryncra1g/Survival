"use client";
import { useState } from "react";

export function AffiliateForm({ initial }: { initial: string }) {
  const [tag, setTag] = useState(initial);
  const [msg, setMsg] = useState("");
  return (
    <form
      className="card p-4 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await fetch("/api/admin/affiliate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amazonTag: tag }) });
        const j = (await r.json()) as { error?: string };
        setMsg(r.ok ? (tag ? "Saved. New plans show Buy buttons." : "Saved. Buy buttons are off for new plans.") : (j.error ?? "Save failed"));
      }}
    >
      <label htmlFor="amazon-tag" className="font-semibold block">Amazon Associates tag</label>
      <p className="text-sm text-muted">With a tag, every recommended item gets a tracked Buy button (Amazon search for its example model) and the affiliate disclosure appears automatically. A catalog item&apos;s own affiliate URL always wins. Leave empty to turn Buy buttons off.</p>
      <div className="flex gap-2">
        <input id="amazon-tag" className="input max-w-xs" placeholder="yourtag-20" value={tag} onChange={(e) => setTag(e.target.value)} />
        <button className="btn">Save</button>
      </div>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </form>
  );
}
