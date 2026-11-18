"use client";
import { useState } from "react";
import type { CatalogItem } from "@/lib/catalog/types";

const blank = (today: string): CatalogItem => ({
  id: "", category: "", name: "", spec: "", models: [], priceLow: 0, priceHigh: 0, tier: 1, phase: 1, priority: 50, qty: 1, tags: [], essential: false, affiliateUrl: null, notes: "", active: true, reviewedAt: today,
});

export function CatalogEditor({ initial, staleDays, today }: { initial: CatalogItem[]; staleDays: number; today: string }) {
  const [items, setItems] = useState(initial);
  const [edit, setEdit] = useState<CatalogItem | null>(null);
  const [msg, setMsg] = useState("");
  const stale = (i: CatalogItem) => (Date.parse(today) - Date.parse(i.reviewedAt)) / 86_400_000 > staleDays;

  async function save(item: CatalogItem) {
    const r = await fetch("/api/admin/catalog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) return setMsg(j.error ?? "Save failed");
    setItems((xs) => (xs.some((x) => x.id === item.id) ? xs.map((x) => (x.id === item.id ? item : x)) : [...xs, item]));
    setEdit(null);
    setMsg(`Saved ${item.id}`);
  }
  async function remove(id: string) {
    if (!confirm(`Delete ${id}?`)) return;
    await fetch("/api/admin/catalog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div className="mt-6 space-y-4">
      {msg && <p role="status" className="card p-2">{msg}</p>}
      <button className="btn" onClick={() => setEdit(blank(today))}>Add item</button>
      {edit && <ItemForm item={edit} onCancel={() => setEdit(null)} onSave={save} today={today} />}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>{["Item", "Phase", "Tier", "Price", "Tags", "Reviewed", ""].map((h) => <th key={h} className="text-left p-2 border-b-2 border-line">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={`align-top ${!i.active ? "opacity-50" : ""}`}>
                <td className="p-2 border-b border-line"><strong>{i.name}</strong><br /><span className="text-muted">{i.category} · {i.id}</span></td>
                <td className="p-2 border-b border-line">{i.phase}</td>
                <td className="p-2 border-b border-line">{i.tier}</td>
                <td className="p-2 border-b border-line">${i.priceLow}–{i.priceHigh}</td>
                <td className="p-2 border-b border-line">{i.tags.join(", ") || "all"}</td>
                <td className={`p-2 border-b border-line ${stale(i) ? "text-danger font-semibold" : ""}`}>{i.reviewedAt}{stale(i) ? " (stale — hidden)" : ""}</td>
                <td className="p-2 border-b border-line whitespace-nowrap">
                  <button className="underline mr-3" onClick={() => setEdit(i)}>Edit</button>
                  <button className="underline mr-3" onClick={() => save({ ...i, reviewedAt: today })}>Mark reviewed</button>
                  <button className="underline text-danger" onClick={() => remove(i.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemForm({ item, onSave, onCancel, today }: { item: CatalogItem; onSave: (i: CatalogItem) => void; onCancel: () => void; today: string }) {
  const [f, setF] = useState(item);
  const field = (k: keyof CatalogItem, label: string, type: "text" | "number" = "text") => (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <input className="input mt-1" type={type} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: type === "number" ? Number(e.target.value) : e.target.value })} />
    </label>
  );
  return (
    <form className="card p-4 grid sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, qty: /^\d+$/.test(String(f.qty)) ? Number(f.qty) : f.qty, affiliateUrl: f.affiliateUrl || null }); }}>
      {field("id", "ID (slug)")}
      {field("category", "Category")}
      {field("name", "Name")}
      {field("qty", "Quantity (number or rule: co_alarms, water_jugs, people, adults, floors, gas_cans)")}
      <label className="block text-sm sm:col-span-2"><span className="font-semibold">Spec to look for</span><textarea className="input mt-1 min-h-20 py-2" value={f.spec} onChange={(e) => setF({ ...f, spec: e.target.value })} /></label>
      <label className="block text-sm sm:col-span-2"><span className="font-semibold">Example models (one per line, max 3)</span><textarea className="input mt-1 min-h-16 py-2" value={f.models.join("\n")} onChange={(e) => setF({ ...f, models: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 3) })} /></label>
      {field("priceLow", "Price low ($)", "number")}
      {field("priceHigh", "Price high ($)", "number")}
      {field("tier", "Budget tier (1 <$500 … 4 $5k+)", "number")}
      {field("phase", "Phase (1–3)", "number")}
      {field("priority", "Priority within phase (lower first)", "number")}
      <label className="block text-sm"><span className="font-semibold">Tags (comma-separated; ! = must not)</span><input className="input mt-1" value={f.tags.join(", ")} onChange={(e) => setF({ ...f, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></label>
      {field("group", "Alternative group (optional)")}
      {field("affiliateUrl", "Affiliate URL (optional — disclosed automatically)")}
      {field("reviewedAt", "Last reviewed (YYYY-MM-DD)")}
      {field("notes", "Notes")}
      <div className="flex gap-4 items-center text-sm">
        <label className="flex gap-2"><input type="checkbox" checked={f.essential} onChange={(e) => setF({ ...f, essential: e.target.checked })} /> Essential</label>
        <label className="flex gap-2"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
      </div>
      <div className="sm:col-span-2 flex gap-3">
        <button className="btn">Save</button>
        <button type="button" className="btn-ghost" onClick={() => setF({ ...f, reviewedAt: today })}>Set reviewed today</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
