"use client";
export function PrintButton() {
  return <button type="button" className="btn-ghost text-sm px-3" onClick={() => window.print()}>Print</button>;
}
