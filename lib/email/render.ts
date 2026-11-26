import { HOWTO } from "@/lib/zip/resources";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { BRAND } from "@/lib/brand";
import { groupIntoChapters } from "@/lib/plan/chapters";
import { firstScreen, REASSURANCE } from "@/lib/plan/nextSteps";

/**
 * Email HTML. Table-based layout, system fonts, under Gmail's ~102 KB clipping limit. Structure, headings, summaries,
 * buttons and Buy links are styled inline; the small repeated touches (muted color, link color, small sizes) are
 * classes in the <style> block to stay under the limit. A client that strips <style> shows those in the body color and
 * size: still readable, just plainer. Every email has the CAN-SPAM footer (physical address + one-click unsubscribe) via `footer()`.
 *
 * Off-site design pass (docs/DESIGN.md): the web's palette (ink-blue headings and links, one amber button per email),
 * calm subject lines, the first 3 steps near the top of the plan email, and a dark mode: clients that honor
 * prefers-color-scheme (Apple Mail, iOS) get the dark palette through the classes below; the rest keep the light one.
 */
/** HTML-escape text and attribute values: & < > " and ' (security review Low 3; safe in single-quoted attributes too). */
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** The web's light tokens (app/globals.css). Amber is only the one button. */
const C = { ink: "#14202c", muted: "#4a5663", line: "#d5d9d2", brand: "#1e3a5c", bg: "#f4f5f2", card: "#ffffff", tint: "#e2eaf3", accent: "#c97407", accentInk: "#1b1203", danger: "#a1261b", warn: "#7a4b00", info: "#1e3a5c" };

/** Dark palette for clients that support prefers-color-scheme (same values as the web's dark tokens). */
const DARK = `@media (prefers-color-scheme:dark){
.bg{background:#0e1319!important}.cd{background:#151c25!important}.tx,.tx p,.tx li,.tx td,.tx th{color:#e9eef3!important}
.tx .mu,.mu{color:#a2afbc!important}.tx .ln,.ln{color:#9fc3ea!important}.br{color:#9fc3ea!important}.tn{background:#1a293a!important}
th.c{background:#1a293a!important}td.c,th.c{border-color:#2a3541!important}.co{background:#1a293a!important}.tx .dg,.dg{color:#f08a7e!important}}`;

export interface EmailMeta {
  appUrl: string;
  unsubscribeUrl: string;
  mailingAddress: string;
  preheader?: string;
}

function shell(title: string, body: string, meta: EmailMeta): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(title)}</title>
<style>td.c,th.c{padding:6px 8px;border-bottom:1px solid ${C.line};vertical-align:top;font-size:14px;text-align:left}th.c{background:${C.tint};font-weight:700}.mu{color:${C.muted}}.ln{color:${C.info}}.f12{font-size:12px}.f13{font-size:13px}.f14{font-size:14px}.f15{font-size:15px}${DARK}</style></head>
<body class="bg" style="margin:0;padding:0;background:${C.bg};${FONT};color:${C.ink};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(meta.preheader ?? title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:${C.bg}"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="cd" style="max-width:600px;background:${C.card};border-radius:10px">
<tr><td class="br" style="padding:22px 22px 6px;font-size:17px;font-weight:700;color:${C.brand}">${esc(BRAND.name)}</td></tr>
<tr><td class="tx" style="padding:0 22px 24px;font-size:16px;line-height:1.55;color:${C.ink}">${body}</td></tr>
</table>${footer(meta)}</td></tr></table></body></html>`;
}

function footer(meta: EmailMeta): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px"><tr><td class="mu" style="padding:16px 20px;font-size:12px;line-height:1.5;color:${C.muted};text-align:center">
${esc(meta.mailingAddress)}<br>You're receiving this because you asked for a ${esc(BRAND.name)} emergency plan.<br>
<a class="mu" href="${esc(meta.unsubscribeUrl)}" style="color:${C.muted}">Unsubscribe</a> · <a class="mu" href="${esc(meta.appUrl)}/privacy" style="color:${C.muted}">Privacy</a> · <a class="mu" href="${esc(meta.appUrl)}/account" style="color:${C.muted}">Manage or delete your data</a></td></tr></table>`;
}

/** The one amber button (docs/DESIGN.md C5): every email has exactly one. Amber with dark text reads in both schemes. */
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td data-button style="background:${C.accent};border-radius:8px"><a href="${esc(href)}" style="display:inline-block;padding:13px 22px;color:${C.accentInk};text-decoration:none;font-weight:700;font-size:16px">${esc(label)}</a></td></tr></table>`;
// Repeated on every row of long plans: classes from the <style> block, not inline styles (Gmail's ~102 KB clip limit).
const muted = (html: string, size = 14) => `<span class="mu f${size}">${html}</span>`;
const link = (href: string, label: string, size = 14) => `<a class="ln f${size}" href="${esc(href)}">${esc(label)}</a>`;

// Cell styles live in a <style> block (class "c") — inlining them on every cell pushes long plans past Gmail's clip limit.
const td = (v: string) => `<td class="c">${esc(v)}</td>`;
const th = (v: string, w = "") => `<th class="c"${w ? ` width="${w}"` : ""}>${esc(v)}</th>`;
/** Tracked Buy link: /go/<itemId>?p=<planId>&src=email */
export const goPath = (itemId: string, planId?: string, src = "web") => `/go/${encodeURIComponent(itemId)}?${planId ? `p=${encodeURIComponent(planId)}&` : ""}src=${src}`;

const levelLine = (levels?: { level: string; price: string; selected: boolean }[]) =>
  // Only the chosen level; Compare options (every level, the difference and new total) is on the plan page.
  levels?.some((l) => l.selected) ? `<br>${muted(`Level: ${esc(levels.find((l) => l.selected)!.level[0].toUpperCase() + levels.find((l) => l.selected)!.level.slice(1))} · other levels on your plan page`, 12)}` : "";

/** National how-to pages are listed once in each section's "What you need" line; steps keep only local links. */
const GENERAL_HOWTO = new Set(Object.values(HOWTO).map((l) => l.url));
/** Each official link appears once per section in email (keeps long plans under Gmail's clip limit). */
const once = (ctx: { seen?: Set<string> }, url: string) => {
  if (!ctx.seen) return true;
  if (ctx.seen.has(url)) return false;
  ctx.seen.add(url);
  return true;
};

function block(b: Block, ctx: { appUrl: string; planId?: string; seen?: Set<string>; diyTips?: boolean } = { appUrl: "" }): string {
  switch (b.type) {
    case "tips":
      // D3b: only when DIY_TIPS_ENABLED is on (the caller passes the flag).
      return ctx.diyTips ? tipsHtml(b) : "";
    case "help":
      // Official links only: Amazon links never go in email.
    {
      const links = b.links.filter((l) => once(ctx, l.url));
      return links.length || b.note ? `<p style="margin:10px 0 4px;font-size:14px"><strong>What you need:</strong>${b.note ? ` ${esc(b.note)}` : ""}${links.map((l) => `<br>${link(l.url, l.label)}`).join("")}</p>` : "";
    }
    case "levelchoice":
      return `<p style="margin:10px 0 4px;font-weight:600">${esc(b.caption)}</p><p style="margin:0 0 8px;font-size:14px">${b.levels.map((l) => `${l.selected ? "<strong>✓ " : ""}${esc(l.name)}: ${esc(l.price)}${l.selected ? "</strong>" : ""}`).join("<br>")}</p>`;
    case "products":
      // The compact shopping list repeats Recommended gear (which has every item with its Buy link): one line instead.
      if (b.compact) return `<p style="margin:8px 0;font-size:14px">Your shopping list, with prices, is under <strong>Recommended gear</strong> below.</p>`;
      return `${b.caption ? `<p class="mu" style="margin:12px 0 4px;font-size:14px;font-weight:600;color:${C.muted}">${esc(b.caption)}</p>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0"><tr>${th("Item")}${th("Price")}${th("")}</tr>${b.items
        .map(
          (i) =>
            `<tr><td class="c"><strong>${esc(i.name)}</strong>${i.qty ? ` ${esc(i.qty)}` : ""}${i.later ? " <em>(when budget allows)</em>" : ""}<br>${muted(esc(i.spec), 13)}${levelLine(i.levels)}</td><td class="c">${esc(i.price)}</td><td class="c">${i.buyable ? (i.emailSafe ? `<a class="ln" href="${esc(ctx.appUrl + goPath(i.itemId, ctx.planId, "email"))}" style="font-weight:700">Buy</a>` : ctx.planId ? `<a class="ln" href="${esc(`${ctx.appUrl}/plan/${ctx.planId}#priorities`)}" style="font-weight:700">Shop</a>` : "") : ""}</td></tr>`,
        )
        .join("")}</table>`;
    case "paragraph":
      return `<p style="margin:8px 0">${esc(b.text)}</p>`;
    case "subheading":
      return `<p style="margin:16px 0 4px;font-weight:700">${esc(b.text)}</p>`;
    case "bullets":
      return `<ul style="margin:8px 0;padding-left:20px">${b.items.map((i) => `<li style="margin:4px 0">${esc(i)}</li>`).join("")}</ul>`;
    case "checklist":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0">${b.items.map((i) => `<tr><td valign="top" style="padding:3px 8px 3px 0">&#9744;</td><td style="padding:3px 0">${esc(i.text)}${i.link && !GENERAL_HOWTO.has(i.link.url) && once(ctx, i.link.url) ? `<br>${link(i.link.url, i.link.label, 13)}` : ""}</td></tr>`).join("")}</table>`;
    case "table":
      if (b.detail) return "";
      return `${b.caption ? `<p class="mu" style="margin:12px 0 4px;font-size:14px;font-weight:600;color:${C.muted}">${esc(b.caption)}</p>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0"><tr>${b.columns.map((c) => th(c)).join("")}</tr>${b.rows.map((r) => `<tr>${r.map(td).join("")}</tr>`).join("")}</table>`;
    case "ifthen":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0"><tr>${th("If…", "45%")}${th("Then…")}</tr>${b.rows.map((r) => `<tr>${td(r.if)}${td(r.then)}</tr>`).join("")}</table>`;
    case "callout": {
      // Red only for safety (docs/DESIGN.md C3); a safety callout also has a thicker rule, so it reads without color.
      const col = b.tone === "danger" ? C.danger : b.tone === "warning" ? C.warn : C.info;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0"><tr><td class="co" style="border-left:${b.tone === "danger" ? 5 : 3}px solid ${col};background:${C.tint};padding:10px 12px;font-size:15px"><strong class="${b.tone === "danger" ? "dg" : "br"}" style="color:${col}">${esc(b.title)}.</strong> ${esc(b.text)}</td></tr></table>`;
    }
  }
}

function tipsHtml(b: Extract<Block, { type: "tips" }>): string {
  const tips = b.tips.map((t) => `<p style="margin:6px 0 2px;font-size:14px"><strong>${esc(t.situation)}</strong> ${t.steps.map(esc).join(" ")} ${link(t.source.url, t.source.label)}</p>`).join("");
  return `<div style="border:1px solid ${C.line};padding:8px 10px;margin:10px 0"><p style="margin:0;font-weight:700">No time to buy? Use what you have</p>${tips}${b.dontDo.length ? `<p class="dg" style="margin:6px 0 0;font-size:14px;color:${C.danger}"><strong>Don't do this:</strong> ${b.dontDo.map(esc).join(" ")}</p>` : ""}</div>`;
}

type First = ReturnType<typeof firstScreen>;
/** The first steps' titles, as on the web's first screen (the shared lib/plan/nextSteps.ts firstScreen). */
export function firstStepItems(doc: PlanDocument): string[] {
  return firstScreen(doc).items.map((i) => i.title ?? i.text);
}
function firstSteps(fs: First): string {
  const items = fs.items;
  if (!items.length) return "";
  return `<p style="margin:16px 0 2px;font-size:17px;font-weight:700">${esc(REASSURANCE)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 4px"><tr><td class="tn" data-first-steps style="background:${C.tint};border-radius:10px;padding:14px 16px">
<p style="margin:0;font-weight:700;font-size:18px">${esc(fs.title)}</p>${fs.note ? `<p style="margin:0 0 4px">${muted(esc(fs.note))}</p>` : ""}
${items
  .map(
    (t) =>
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0"><tr><td valign="top" style="padding:0 10px 0 0;font-size:18px;line-height:1.3">&#9744;</td><td><strong style="font-size:16px">${esc(t.title ?? t.text)}</strong>${t.title && t.title !== t.text ? `<br><span style="font-size:14px">${esc(t.text)}</span>` : ""}${t.why ? `<br>${muted(esc(t.why), 13)}` : ""}${t.link ? `<br>${link(t.link.url, t.link.label, 13)}` : ""}</td></tr></table>`,
  )
  .join("")}
</td></tr></table>`;
}

export function renderPlanEmail(doc: PlanDocument, meta: EmailMeta & { planUrl: string; pdfAttached: boolean; planId?: string; diyTips?: boolean }): { subject: string; html: string; text: string } {
  // The web's chapter order (Do now, Supplies, Power & heat, People & plans); sections keep their numbers.
  const ordered = groupIntoChapters(doc.sections);
  const fs = firstScreen(doc);
  const toc = ordered.map((ch) => `${esc(ch.title)}: ${ch.items.map((s) => `${s.number}. ${esc(s.title)}`).join(", ")}`).join("<br>");
  const sections = ordered
    .map(
      (ch) =>
        `<h2 class="br" style="margin:30px 0 0;font-size:20px;color:${C.brand}">${esc(ch.title)}</h2>` +
        ch.items
          .map((s) => {
            const blocks = s.id === "gear" ? s.blocks.map((b) => (b.type === "table" ? { ...b, columns: ["Item", "Look for", "Price"], rows: b.rows.map((r) => [r[0], r[1], r[3]]) } : b)) : s.blocks;
            const ctx = { appUrl: meta.appUrl, planId: meta.planId, seen: new Set<string>(), diyTips: !!meta.diyTips };
            return `<h3 style="margin:22px 0 4px;font-size:17px;border-top:1px solid ${C.line};padding-top:14px">${s.number}. ${esc(s.title)}</h3><p class="tn" style="margin:4px 0 8px;background:${C.tint};padding:10px 12px">${esc(s.summary)}</p>${blocks.map((b) => block(b, ctx)).join("")}`;
          })
          .join(""),
    )
    .join("");
  const body = `<h1 style="margin:0 0 4px;font-size:24px;line-height:1.25">${esc(doc.title)}</h1><p style="margin:0">${muted(esc(doc.subtitle), 15)}</p>
${firstSteps(fs)}
${button(meta.planUrl, "Open your plan")}
<p style="margin:0 0 8px">${muted(`${meta.pdfAttached ? "Attached: your full plan as a PDF, plus a one-page checklist for the fridge. " : ""}General guidance, not professional advice. Full disclaimer at the end.`, 13)}</p>
<p style="margin:12px 0 0;font-size:13px">${muted(`<strong>In this plan</strong><br>${toc}`, 13)}</p>
${sections}
<h2 style="margin:28px 0 4px;font-size:17px">Sources &amp; disclaimers</h2><p style="margin:4px 0 8px">${muted(esc(doc.disclaimer), 13)}</p>${doc.affiliateDisclosure ? `<p style="margin:8px 0">${muted(`<strong>Affiliate disclosure:</strong> ${esc(doc.affiliateDisclosure)}`, 13)}</p>` : ""}<ul style="margin:4px 0;padding-left:20px;font-size:14px">${doc.sources.map((s) => `<li>${link(s.url, s.name)}</li>`).join("")}</ul>`;
  return {
    subject: planSubject(doc),
    html: shell(doc.title, body, { ...meta, preheader: fs.items.length ? `${REASSURANCE} ${fs.title}.` : doc.subtitle }),
    text: planToText(doc, meta, fs),
  };
}

/** e.g. "Your 90-day emergency plan for Long Island is ready" */
export function planSubject(doc: PlanDocument): string {
  const [, region, scenario] = doc.subtitle.split(" · ");
  const adj: Record<string, string> = { "72 hours": "72-hour", "2 weeks": "2-week", "30 days": "30-day", "90 days": "90-day" };
  return region && scenario ? `Your ${adj[scenario] ?? scenario} emergency plan for ${region} is ready` : `Your ${BRAND.name} emergency plan`;
}

/** The plain-text version matches the HTML: the reassurance and the first 3 steps first, then the chapters in web order. */
export function planToText(doc: PlanDocument, meta: EmailMeta & { planUrl: string; planId?: string }, fs: First = firstScreen(doc)): string {
  const first = fs.items;
  const lines = [doc.title, doc.subtitle, ""];
  if (first.length) {
    lines.push(REASSURANCE, "", fs.title.toUpperCase());
    if (fs.note) lines.push(fs.note);
    for (const t of first) {
      lines.push(`[ ] ${t.title ?? t.text}`);
      if (t.title && t.title !== t.text) lines.push(`    ${t.text}`);
      if (t.why) lines.push(`    ${t.why}`);
      if (t.link) lines.push(`    ${t.link.label}: ${t.link.url}`);
    }
    lines.push("");
  }
  lines.push(`Open your plan: ${meta.planUrl}`, "", doc.disclaimer, "");
  for (const ch of groupIntoChapters(doc.sections)) {
    lines.push(`== ${ch.title.toUpperCase()} ==`, "");
    for (const s of ch.items) {
      lines.push(`${s.number}. ${s.title.toUpperCase()}`, s.summary, "");
      for (const b of s.blocks) {
        if (b.type === "paragraph" || b.type === "subheading") lines.push(b.text);
        if (b.type === "bullets") lines.push(...b.items.map((i) => `- ${i}`));
        if (b.type === "checklist") lines.push(...b.items.map((i) => `[ ] ${i.text}${i.link ? ` (${i.link.label}: ${i.link.url})` : ""}`));
        if (b.type === "table") lines.push(...(b.caption ? [b.caption] : []), b.columns.join(" | "), ...b.rows.map((r) => r.join(" | ")));
        if (b.type === "ifthen") lines.push(...b.rows.map((r) => `IF ${r.if} -> ${r.then}`));
        // No "!!": a safety callout is labelled SAFETY, others NOTE (docs/DESIGN.md C2).
        if (b.type === "callout") lines.push(`${b.tone === "danger" ? "SAFETY" : "NOTE"}: ${b.title}: ${b.text}`);
        if (b.type === "help") lines.push(...(b.note ? [b.note] : []), ...b.links.map((l) => `${l.label}: ${l.url}`));
        if (b.type === "levelchoice") lines.push(b.caption, ...b.levels.map((l) => `${l.selected ? "[x]" : "[ ]"} ${l.name}: ${l.price}`));
        if (b.type === "products") lines.push(...(b.caption ? [b.caption] : []), ...b.items.map((i) => `- ${i.name} ${i.qty} (${i.price}): ${i.spec}${i.buyable && i.emailSafe ? ` — buy: ${meta.appUrl}${goPath(i.itemId, meta.planId, "email")}` : ""}`));
      }
      lines.push("");
    }
  }
  lines.push("Sources:", ...doc.sources.map((s) => `- ${s.name}: ${s.url}`), "", meta.mailingAddress, `Unsubscribe: ${meta.unsubscribeUrl}`);
  return lines.join("\n");
}

const textFooter = (meta: EmailMeta) => `${meta.mailingAddress}\nUnsubscribe: ${meta.unsubscribeUrl}`;

export function renderConfirmEmail(link: string, meta: EmailMeta) {
  const body = `<h1 style="margin:0 0 8px;font-size:22px">One tap to get your plan by email</h1><p>Tap below to confirm this is your email. We'll send your plan with a printable PDF and a fridge checklist, and the same link lets you come back and update it.</p>${button(link, "Confirm and send my plan")}<p>${muted("This link expires in 7 days. If you didn't ask for a plan, you can ignore this email and you won't hear from us again.", 13)}</p>`;
  return {
    subject: "Confirm your email to get your plan",
    html: shell("Confirm your email", body, meta),
    text: `One tap to get your plan by email\n\nConfirm this is your email and we'll send your plan with a printable PDF and a fridge checklist:\n${link}\n\nThis link expires in 7 days. If you didn't ask for a plan, you can ignore this email.\n\n${textFooter(meta)}`,
  };
}

/** Sent once, a day after signup, if the address was never confirmed but a plan exists. */
export function renderConfirmReminder(link: string, meta: EmailMeta) {
  const body = `<h1 style="margin:0 0 8px;font-size:22px">Your plan is ready to send</h1><p>You built an emergency plan. Confirm this is your email and we'll send it, with a printable PDF and a fridge checklist.</p>${button(link, "Confirm and send my plan")}<p>${muted("This is the only reminder we'll send. If you didn't ask for a plan, you can ignore it.", 13)}</p>`;
  return {
    subject: "Your emergency plan is ready to send",
    html: shell("Your plan is ready to send", body, meta),
    text: `Your plan is ready to send\n\nConfirm this is your email and we'll send your plan, a printable PDF and a fridge checklist:\n${link}\n\nThis is the only reminder we'll send.\n\n${textFooter(meta)}`,
  };
}

export function renderLoginEmail(link: string, meta: EmailMeta) {
  const body = `<h1 style="margin:0 0 8px;font-size:22px">Your sign-in link</h1><p>Use this link to open your plan, change your answers, or download or delete your data.</p>${button(link, "Open my plan")}<p>${muted("This link works once and expires in 1 hour. If you didn't ask for it, you can ignore this email.", 13)}</p>`;
  return {
    subject: `Your ${BRAND.name} sign-in link`,
    html: shell("Sign in", body, meta),
    text: `Your sign-in link\n\nOpen your plan, change your answers, or download or delete your data:\n${link}\n\nThis link works once and expires in 1 hour. If you didn't ask for it, you can ignore this email.\n\n${textFooter(meta)}`,
  };
}

export type FollowupKind = "day1" | "day3" | "day30" | "winter" | "hurricane";
/** Follow-ups (owner opted in). Calm: one small next step, no urgency; the safety line in the winter check is kept as is. */
export const FOLLOWUP_COPY: Record<FollowupKind, { subject: string; h: string; p: string[] }> = {
  day1: { subject: "Your first 3 steps", h: "Your first 3 steps", p: ["Most of your plan can wait. Start with the first 3 steps at the top of your plan.", "You don't need to do them all today. One is a good start."] },
  day3: { subject: "A quick check-in on your plan", h: "A quick check-in", p: ["Three days ago you made your plan. How is the This week list going?", "If you have a few minutes today, test your CO alarms or start on your first 3 days of water."] },
  day30: { subject: "Next in your plan: power and food", h: "Next: power and food", p: ["It's been a month. When Phase 1 (CO alarms, water, heat) is done, Phase 2 is power and food.", "Your plan has the food list and fuel math worked out for your household."] },
  winter: { subject: `Your ${BRAND.name} winter check`, h: "Winter check", p: ["Cold weather is coming. Test CO alarms, check your heat plan and warm room, insulate exposed pipes, and refresh propane and sleeping bags.", "Never run a generator or grill indoors or in a garage."] },
  hurricane: { subject: "Hurricane season: a quick check", h: "Hurricane season check", p: ["Hurricane season runs June 1 – November 30. Check your evacuation zone, window protection, insurance and fuel, and keep go-bags ready."] },
};
export function renderFollowupEmail(kind: FollowupKind, planUrl: string, meta: EmailMeta) {
  const c = FOLLOWUP_COPY[kind];
  const body = `<h1 style="margin:0 0 8px;font-size:22px">${esc(c.h)}</h1>${c.p.map((p) => `<p>${esc(p)}</p>`).join("")}${button(planUrl, "Open my plan")}`;
  return { subject: c.subject, html: shell(c.h, body, meta), text: `${c.h}\n\n${c.p.join("\n\n")}\n\nOpen my plan: ${planUrl}\n\n${textFooter(meta)}` };
}

/** D12 (accounts track): opt-in maintenance reminder. Task text only: no links to stores, no health details, no addresses. */
export function renderReminderEmail(tasks: { when: string; task: string }[], planUrl: string, meta: EmailMeta) {
  const subject = tasks.length === 1 ? `Reminder: ${tasks[0].task}` : `${tasks.length} preparedness checks are due`;
  const body = `<h1 style="margin:0 0 8px;font-size:22px">Time for a quick check</h1><ul>${tasks.map((t) => `<li><strong>${esc(t.when)}:</strong> ${esc(t.task)}</li>`).join("")}</ul><p>${muted("You asked for these reminders. Change or turn them off any time on the Reminders page.", 13)}</p>${button(planUrl, "Open my plan")}`;
  return { subject, html: shell("Time for a quick check", body, meta), text: `Time for a quick check\n\n${tasks.map((t) => `- ${t.when}: ${t.task}`).join("\n")}\n\nOpen my plan: ${planUrl}\n\nYou asked for these reminders. Change or turn them off any time on the Reminders page.\n\n${textFooter(meta)}` };
}
