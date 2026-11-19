"use client";
export function PrintButton() {
  return <button type="button" className="btn-ghost border border-line text-sm px-3 min-h-[44px]" onClick={() => window.print()}>Print</button>;
}
