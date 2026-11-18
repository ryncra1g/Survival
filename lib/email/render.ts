import type { Block, PlanDocument } from "@/lib/plan/document";
import { BRAND } from "@/lib/brand";

/**
 * Email HTML. Table-based layout, inline styles only (Gmail/iOS Mail safe), system fonts,
 * light background forced, under Gmail's ~102 KB clipping limit. Every email has the
 * CAN-SPAM footer (physical address + one-click unsubscribe) via `footer()`.
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const C = { ink: "#1c2430", muted: "#5b6573", line: "#dfe3e8", brand: "#b3471d", bg: "#f4f1ec", card: "#ffffff", danger: "#a1261b", warn: "#8a5a00", info: "#1f4f7a" };

export interface EmailMeta {
  appUrl: string;
  unsubscribeUrl: string;
  mailingAddress: string;
  preheader?: string;
}

function shell(title: string, body: string, meta: EmailMeta): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title>
<style>td.c,th.c{padding:6px 8px;border-bottom:1px solid ${C.line};vertical-align:top;font-size:13px;text-align:left}th.c{background:#f7f7f5;font-weight:700}</style></head>
<body style="margin:0;padding:0;background:${C.bg};${FONT};color:${C.ink};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(meta.preheader ?? title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.card};border-radius:8px">
<tr><td style="padding:20px 20px 8px;font-size:20px;font-weight:700;color:${C.brand}">${esc(BRAND.name)}</td></tr>
<tr><td style="padding:0 20px 20px;font-size:15px;line-height:1.5">${body}</td></tr>
</table>${footer(meta)}</td></tr></table></body></html>`;
}

function footer(meta: EmailMeta): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px"><tr><td style="padding:16px 20px;font-size:12px;line-height:1.5;color:${C.muted};text-align:center">
${esc(meta.mailingAddress)}<br>You're receiving this because you asked for a ${esc(BRAND.name)} emergency plan.<br>
<a href="${esc(meta.unsubscribeUrl)}" style="color:${C.muted}">Unsubscribe</a> · <a href="${esc(meta.appUrl)}/privacy" style="color:${C.muted}">Privacy</a> · <a href="${esc(meta.appUrl)}/account" style="color:${C.muted}">Manage or delete your data</a></td></tr></table>`;
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="background:${C.brand};border-radius:6px"><a href="${esc(href)}" style="display:inline-block;padding:12px 20px;color:#fff;text-decoration:none;font-weight:600;font-size:16px">${esc(label)}</a></td></tr></table>`;

// Cell styles live in a <style> block (class "c") — inlining them on every cell pushes long plans past Gmail's clip limit.
const td = (v: string) => `<td class="c">${esc(v)}</td>`;
const th = (v: string, w = "") => `<th class="c"${w ? ` width="${w}"` : ""}>${esc(v)}</th>`;
/** Tracked Buy link: /go/<itemId>?p=<planId>&src=email */
export const goPath = (itemId: string, planId?: string, src = "web") => `/go/${encodeURIComponent(itemId)}?${planId ? `p=${encodeURIComponent(planId)}&` : ""}src=${src}`;

const levelLine = (levels?: { level: string; price: string; selected: boolean }[]) =>
  levels ? `<br><span style="color:${C.muted};font-size:12px">Levels: ${levels.map((l) => `${l.selected ? "<strong>" : ""}${esc(l.level[0].toUpperCase() + l.level.slice(1))} ${esc(l.price)}${l.selected ? "</strong>" : ""}`).join(" · ")}</span>` : "";

function block(b: Block, ctx: { appUrl: string; planId?: string } = { appUrl: "" }): string {
  switch (b.type) {
    case "levelchoice":
      return `<p style="margin:10px 0 4px;font-weight:600">${esc(b.caption)}</p><p style="margin:0 0 8px;font-size:13px">${b.levels.map((l) => `${l.selected ? "<strong>✓ " : ""}${esc(l.name)}: ${esc(l.price)}${l.selected ? "</strong>" : ""}`).join("<br>")}</p>`;
    case "products":
      return `${b.caption ? `<p style="margin:12px 0 4px;font-size:13px;font-weight:600;color:${C.muted}">${esc(b.caption)}</p>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0"><tr>${th("Item")}${th("Price")}${th("")}</tr>${b.items
        .map(
          (i) =>
            `<tr><td class="c"><strong>${esc(i.name)}</strong>${i.qty ? ` ${esc(i.qty)}` : ""}${i.later ? " <em>(later)</em>" : ""}<br><span style="color:${C.muted}">${esc(i.spec)}</span>${levelLine(i.levels)}</td><td class="c">${esc(i.price)}</td><td class="c">${i.buyable ? (i.emailSafe ? `<a href="${esc(ctx.appUrl + goPath(i.itemId, ctx.planId, "email"))}" style="color:${C.brand};font-weight:700">Buy</a>` : ctx.planId ? `<a href="${esc(`${ctx.appUrl}/plan/${ctx.planId}#priorities`)}" style="color:${C.brand};font-weight:700">Shop</a>` : "") : ""}</td></tr>`,
        )
        .join("")}</table>`;
    case "paragraph":
      return `<p style="margin:8px 0">${esc(b.text)}</p>`;
    case "subheading":
      return `<p style="margin:14px 0 4px;font-weight:700">${esc(b.text)}</p>`;
    case "bullets":
      return `<ul style="margin:8px 0;padding-left:20px">${b.items.map((i) => `<li style="margin:3px 0">${esc(i)}</li>`).join("")}</ul>`;
    case "checklist":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0">${b.items.map((i) => `<tr><td valign="top" style="padding:2px 8px 2px 0">&#9744;</td><td style="padding:2px 0">${esc(i.text)}</td></tr>`).join("")}</table>`;
    case "table":
      return `${b.caption ? `<p style="margin:12px 0 4px;font-size:13px;font-weight:600;color:${C.muted}">${esc(b.caption)}</p>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0"><tr>${b.columns.map((c) => th(c)).join("")}</tr>${b.rows.map((r) => `<tr>${r.map(td).join("")}</tr>`).join("")}</table>`;
    case "ifthen":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0"><tr>${th("If…", "45%")}${th("Then…")}</tr>${b.rows.map((r) => `<tr>${td(r.if)}${td(r.then)}</tr>`).join("")}</table>`;
    case "callout": {
      const col = b.tone === "danger" ? C.danger : b.tone === "warning" ? C.warn : C.info;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0"><tr><td style="border-left:4px solid ${col};background:#faf8f5;padding:10px 12px;font-size:14px"><strong style="color:${col}">${esc(b.title)}.</strong> ${esc(b.text)}</td></tr></table>`;
    }
  }
}

/** The plan email: same structure as on screen. Gear specs are shortened to stay under Gmail's clip limit. */
export function renderPlanEmail(doc: PlanDocument, meta: EmailMeta & { planUrl: string; pdfAttached: boolean; planId?: string }): { subject: string; html: string; text: string } {
  const toc = doc.sections.map((s) => `${s.number}. ${esc(s.title)}`).join(" · ");
  const sections = doc.sections
    .map((s) => {
      const blocks = s.id === "gear" ? s.blocks.map((b) => (b.type === "table" ? { ...b, columns: ["Item", "Look for", "Price"], rows: b.rows.map((r) => [r[0], r[1], r[3]]) } : b)) : s.blocks;
      return `<h2 style="margin:24px 0 4px;font-size:18px;border-top:2px solid ${C.line};padding-top:16px">${s.number}. ${esc(s.title)}</h2><p style="margin:4px 0 8px;font-size:15px;color:${C.ink};background:#fbf3ea;padding:8px 10px;border-radius:4px">${esc(s.summary)}</p>${blocks.map((b) => block(b, { appUrl: meta.appUrl, planId: meta.planId })).join("")}`;
    })
    .join("");
  const body = `<h1 style="margin:0 0 4px;font-size:22px">${esc(doc.title)}</h1><p style="margin:0;color:${C.muted};font-size:14px">${esc(doc.subtitle)}</p>
${button(meta.planUrl, "Open your plan")}
<p style="margin:0 0 8px;font-size:13px;color:${C.muted}">${meta.pdfAttached ? "Attached: your full plan as a PDF, plus a one-page checklist for the fridge. " : ""}Sections: ${toc}</p>
<p style="margin:4px 0 8px;font-size:12px;color:${C.muted}">General guidance, not professional advice. Full disclaimer at the end.</p>
${firstSteps(doc)}
${sections}
<h2 style="margin:24px 0 4px;font-size:16px">Sources &amp; disclaimers</h2><p style="margin:4px 0 8px;font-size:13px;color:${C.muted}">${esc(doc.disclaimer)}</p>${doc.affiliateDisclosure ? `<p style="margin:8px 0;font-size:13px;color:${C.muted}"><strong>Affiliate disclosure:</strong> ${esc(doc.affiliateDisclosure)}</p>` : ""}<ul style="margin:4px 0;padding-left:20px;font-size:13px">${doc.sources.map((s) => `<li><a href="${esc(s.url)}" style="color:${C.info}">${esc(s.name)}</a></li>`).join("")}</ul>`;
  return {
    subject: planSubject(doc),
    html: shell(doc.title, body, { ...meta, preheader: doc.sections[0]?.summary }),
    text: planToText(doc, meta),
  };
}

/** The first three "This week" items, so the email opens with something doable today. */
export function firstStepItems(doc: PlanDocument): string[] {
  const b = doc.sections.find((x) => x.id === "priorities")?.blocks.find((x) => x.type === "checklist");
  return b && b.type === "checklist" ? b.items.slice(0, 3).map((i) => i.text) : [];
}
function firstSteps(doc: PlanDocument): string {
  const items = firstStepItems(doc);
  if (!items.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0"><tr><td style="border:2px solid ${C.brand};border-radius:8px;padding:12px 14px"><p style="margin:0 0 6px;font-weight:700;font-size:16px">Start here: your first 3 steps</p><ol style="margin:0;padding-left:20px">${items.map((t) => `<li style="margin:4px 0">${esc(t)}</li>`).join("")}</ol></td></tr></table>`;
}

/** e.g. "Your 90-day emergency plan for Long Island is ready" */
export function planSubject(doc: PlanDocument): string {
  const [, region, scenario] = doc.subtitle.split(" · ");
  const adj: Record<string, string> = { "72 hours": "72-hour", "2 weeks": "2-week", "30 days": "30-day", "90 days": "90-day" };
  return region && scenario ? `Your ${adj[scenario] ?? scenario} emergency plan for ${region} is ready` : `Your ${BRAND.name} emergency plan`;
}

export function planToText(doc: PlanDocument, meta: EmailMeta & { planUrl: string; planId?: string }): string {
  const lines = [doc.title, doc.subtitle, `Open your plan: ${meta.planUrl}`, "", doc.disclaimer, ""];
  for (const s of doc.sections) {
    lines.push(`${s.number}. ${s.title.toUpperCase()}`, s.summary, "");
    for (const b of s.blocks) {
      if (b.type === "paragraph" || b.type === "subheading") lines.push(b.text);
      if (b.type === "bullets") lines.push(...b.items.map((i) => `- ${i}`));
      if (b.type === "checklist") lines.push(...b.items.map((i) => `[ ] ${i.text}`));
      if (b.type === "table") lines.push(...(b.caption ? [b.caption] : []), b.columns.join(" | "), ...b.rows.map((r) => r.join(" | ")));
      if (b.type === "ifthen") lines.push(...b.rows.map((r) => `IF ${r.if} -> ${r.then}`));
      if (b.type === "callout") lines.push(`!! ${b.title}: ${b.text}`);
      if (b.type === "levelchoice") lines.push(b.caption, ...b.levels.map((l) => `${l.selected ? "[x]" : "[ ]"} ${l.name}: ${l.price}`));
      if (b.type === "products") lines.push(...(b.caption ? [b.caption] : []), ...b.items.map((i) => `- ${i.name} ${i.qty} (${i.price}): ${i.spec}${i.buyable && i.emailSafe ? ` — buy: ${meta.appUrl}${goPath(i.itemId, meta.planId, "email")}` : ""}`));
    }
    lines.push("");
  }
  lines.push("Sources:", ...doc.sources.map((s) => `- ${s.name}: ${s.url}`), "", meta.mailingAddress, `Unsubscribe: ${meta.unsubscribeUrl}`);
  return lines.join("\n");
}

export function renderConfirmEmail(link: string, meta: EmailMeta) {
  const body = `<h1 style="margin:0 0 8px;font-size:22px">One tap to get your plan by email</h1><p>Finish your questions on screen — your plan appears as soon as you're done. Tap below to confirm this is your email and we'll send the plan with a printable PDF. The same link lets you come back and update it.</p>${button(link, "Confirm & send my plan")}<p style="font-size:13px;color:${C.muted}">This link expires in 7 days. If you didn't request a plan, ignore this email — you won't hear from us again.</p>`;
  return { subject: "Confirm your email to get your plan + PDF", html: shell("Confirm your email", body, meta), text: `Confirm your email and get your plan: ${link}\n\nIf you didn't request this, ignore this email.\n\n${meta.mailingAddress}\nUnsubscribe: ${meta.unsubscribeUrl}` };
}

/** Sent once, a day after signup, if the address was never confirmed but a plan exists. */
export function renderConfirmReminder(link: string, meta: EmailMeta) {
  const body = `<h1 style="margin:0 0 8px;font-size:22px">Your plan is waiting</h1><p>You built an emergency plan but we haven't been able to send it yet. Tap below to confirm this is your email and we'll send the plan, a printable PDF and a fridge checklist.</p>${button(link, "Confirm & send my plan")}<p style="font-size:13px;color:${C.muted}">This is the only reminder we'll send. If you didn't request a plan, ignore it.</p>`;
  return { subject: "Your emergency plan is waiting", html: shell("Your plan is waiting", body, meta), text: `Confirm your email and we'll send your plan: ${link}\n\nThis is the only reminder we'll send.\n\n${meta.mailingAddress}\nUnsubscribe: ${meta.unsubscribeUrl}` };
}

export function renderLoginEmail(link: string, meta: EmailMeta) {
  const body = `<h1 style="margin:0 0 8px;font-size:22px">Your sign-in link</h1><p>Use this link to open your plan, edit your answers, or download or delete your data.</p>${button(link, "Open my plan")}<p style="font-size:13px;color:${C.muted}">This link expires in 1 hour and works once.</p>`;
  return { subject: `Your ${BRAND.name} sign-in link`, html: shell("Sign in", body, meta), text: `Open your plan: ${link}\n\n${meta.mailingAddress}` };
}

export type FollowupKind = "day1" | "day3" | "day30" | "winter" | "hurricane";
export function renderFollowupEmail(kind: FollowupKind, planUrl: string, meta: EmailMeta) {
  const copy: Record<FollowupKind, { subject: string; h: string; p: string[] }> = {
    day1: { subject: "3 things to do today", h: "Your 3 steps for today", p: ["Most of your plan can wait. These three can't: test your CO alarms, store your first 3 days of water, and pick an out-of-area contact everyone can text.", "Each takes under 20 minutes."] },
    day3: { subject: "Did you finish your 'This week' list?", h: "Quick check-in", p: ["Three days ago you made your plan. How's the 'This week' list going?", "If you only do one thing today: test your CO alarms and fill your first 3 days of water."] },
    day30: { subject: "Time for Phase 2: power and food", h: "Phase 2 reminder", p: ["It's been a month. If Phase 1 (CO alarms, water, heat) is done, Phase 2 is power and food.", "Your plan has the exact food list and fuel math for your household."] },
    winter: { subject: `Your ${BRAND.name} winter check`, h: "Winter check", p: ["Cold weather is coming. Test CO alarms, check your heat plan and warm room, insulate exposed pipes, and refresh propane and sleeping bags.", "Never run a generator or grill indoors or in a garage."] },
    hurricane: { subject: "Hurricane season starts now", h: "Hurricane season check", p: ["Hurricane season runs June 1 – November 30. Check your evacuation zone, window protection, insurance and fuel, and keep go-bags ready."] },
  };
  const c = copy[kind];
  const body = `<h1 style="margin:0 0 8px;font-size:22px">${c.h}</h1>${c.p.map((p) => `<p>${esc(p)}</p>`).join("")}${button(planUrl, "Open my plan")}`;
  return { subject: c.subject, html: shell(c.h, body, meta), text: `${c.p.join("\n\n")}\n\n${planUrl}\n\n${meta.mailingAddress}\nUnsubscribe: ${meta.unsubscribeUrl}` };
}
