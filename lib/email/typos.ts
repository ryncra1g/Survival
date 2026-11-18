/** Catch common email-domain typos ("gmial.com" → "gmail.com") so plans don't bounce. */
const DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "comcast.net", "verizon.net", "att.net", "live.com", "msn.com", "me.com", "proton.me", "protonmail.com", "optonline.net", "sbcglobal.net"];
const TLD_FIXES: Record<string, string> = { con: "com", cmo: "com", ocm: "com", vom: "com", comm: "com", co: "com", nte: "net", ent: "net" };

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** Returns a corrected address, or null if the domain looks fine. */
export function suggestEmail(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m) return null;
  const [, local, domain] = m;
  if (DOMAINS.includes(domain)) return null;
  const parts = domain.split(".");
  const tld = parts.pop()!;
  const fixedTld = TLD_FIXES[tld] && parts.length ? `${parts.join(".")}.${TLD_FIXES[tld]}` : null;
  const candidate = fixedTld ?? domain;
  if (DOMAINS.includes(candidate)) return `${local}@${candidate}`;
  let best: string | null = null;
  let bestD = 3;
  for (const d of DOMAINS) {
    const dist = distance(candidate, d);
    if (dist < bestD && dist <= (d.length > 8 ? 2 : 1)) {
      best = d;
      bestD = dist;
    }
  }
  return best ? `${local}@${best}` : fixedTld ? `${local}@${fixedTld}` : null;
}
