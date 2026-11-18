"use client";
import { useState } from "react";

export function RulesEditor({ initial, defaults }: { initial: string; defaults: string }) {
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState("");
  async function save() {
    let overrides: unknown;
    try {
      overrides = JSON.parse(text);
    } catch {
      return setMsg("Not valid JSON");
    }
    const r = await fetch("/api/admin/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ overrides }) });
    const j = (await r.json()) as { version?: number; error?: string };
    setMsg(r.ok ? `Saved as version ${j.version}` : (j.error ?? "Save failed"));
  }
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div>
        <label htmlFor="ov" className="font-semibold">Overrides (only the keys you want to change)</label>
        <p className="text-sm text-muted">Example: {`{ "water": { "adultGalPerDay": 1.25 } }`}</p>
        <textarea id="ov" className="input font-mono text-xs min-h-[28rem] py-2 mt-2" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        <button className="btn mt-3" onClick={save}>Validate & save new version</button>
        {msg && <p role="status" className="mt-2">{msg}</p>}
      </div>
      <div>
        <p className="font-semibold">Defaults (read-only)</p>
        <pre className="card p-3 text-xs overflow-auto max-h-[34rem] mt-2">{defaults}</pre>
      </div>
    </div>
  );
}
