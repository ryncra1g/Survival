export const n = (v: number, dp = 0) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
export const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
export const usdRange = (lo: number, hi: number) => (lo === hi ? usd(lo) : `${usd(lo)}–${usd(hi)}`);
export const range = (lo: number, hi: number, dp = 1) => (lo === hi ? n(lo, dp) : `${n(lo, dp)}–${n(hi, dp)}`);
export const plural = (count: number, one: string, many = one + "s") => `${n(count)} ${count === 1 ? one : many}`;
/** Mid-sentence item name: "Carbon monoxide alarm" → "carbon monoxide alarm"; "NOAA weather radio", "AA/AAA battery stock" keep their capitals. */
export const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Replace {{token}} placeholders with values. Unknown tokens throw — callers validate first. */
export function fillTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    if (!(key in tokens)) throw new Error(`Unknown token {{${key}}}`);
    return tokens[key];
  });
}

export function tokensIn(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)].map((m) => m[1]);
}
