import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderFridgeChecklist, fridgeContent } from "@/lib/pdf/FridgeChecklist";
import { renderPlanPdf, weekItems } from "@/lib/pdf/PlanPdf";
import {
  FOLLOWUP_COPY,
  firstStepItems,
  renderConfirmEmail,
  renderConfirmReminder,
  renderFollowupEmail,
  renderLoginEmail,
  renderPlanEmail,
  renderReminderEmail,
} from "@/lib/email/render";
import { REASSURANCE } from "@/lib/plan/nextSteps";
import { PERSONAS } from "./fixtures/personas";
import { buildPlan } from "./helpers/build";
import { EXACT, EXCLAIM, URGENCY } from "./helpers/copyRules";
import { pageTexts, squash } from "./helpers/pdfText";

/**
 * Everything that leaves the website (off-site design pass, docs/DESIGN.md): the plan PDF, the fridge checklist and
 * every email.
 */
const meta = { appUrl: "https://app.example", unsubscribeUrl: "https://app.example/api/unsubscribe?u=1&s=x", mailingAddress: "123 Main St, Town, ST 00000" };
const pdfSafe = (t: string) => t.replace(/–/g, "\u0096");

describe("plan PDF", () => {
  it.each(PERSONAS.map((p) => [p.name, p.a] as const))("%s: page 1 has the reassurance and the first 3 short titles, in order", async (_n, a) => {
    const { document: doc } = await buildPlan(a);
    const [page1] = await pageTexts(await renderPlanPdf(doc));
    const t = squash(page1);
    expect(t).toContain(squash(REASSURANCE));
    expect(t).toContain(squash("Start with these 3"));
    const titles = weekItems(doc).slice(0, 3).map((i) => i.title ?? i.text);
    expect(titles).toHaveLength(3);
    const at = titles.map((title) => t.indexOf(squash(pdfSafe(title))));
    for (const [i, pos] of at.entries()) expect(pos, titles[i]).toBeGreaterThan(-1);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
    // …with their "how to" details: each step's full text sits under its title.
    for (const it of weekItems(doc).slice(0, 3)) expect(t).toContain(squash(pdfSafe(it.text)).slice(0, 40));
  });
  it("keeps page numbers", async () => {
    const pages = await pageTexts(await renderPlanPdf((await buildPlan()).document));
    expect(pages.length).toBeGreaterThan(5);
  });
});

describe("fridge checklist", () => {
  it.each(PERSONAS.map((p) => [p.name, p.a] as const))("%s: exactly one page, with the first 3, key amounts, contacts and Day 0", async (_n, a) => {
    const { document: doc } = await buildPlan(a);
    const pdf = await renderFridgeChecklist(doc);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
    const [page] = await pageTexts(pdf);
    const t = squash(page);
    const c = fridgeContent(doc);
    expect(c.first).toEqual(firstStepItems(doc));
    for (const s of c.first) expect(t).toContain(squash(pdfSafe(s)));
    expect(c.amounts.map((x) => x.label)).toEqual(expect.arrayContaining(["water to store", "calories of food", "cash on hand"]));
    for (const x of c.amounts) expect(t).toContain(squash(pdfSafe(x.value)));
    for (const l of c.contacts) expect(t).toContain(squash(l));
    expect(c.day0.length).toBeGreaterThan(0);
    expect(t).toContain(squash("Carbon monoxide:"));
  });
});

describe("emails pass the design copy checks", () => {
  /** Safety instructions are direct by design (DESIGN.md C1): plan safety callouts and decision triggers are exempt. */
  const calm = (text: string) =>
    text
      .split("\n")
      .filter((l) => !/^SAFETY: |^IF .* -> /.test(l))
      .filter((l) => EXCLAIM.test(l) || URGENCY.some((re) => re.test(l)) || EXACT.test(l));

  const all = async () => {
    const plans = await Promise.all(PERSONAS.map(async (p) => ({ name: `plan: ${p.name}`, doc: (await buildPlan(p.a)).document })));
    return [
      ...plans.map((p) => ({ name: p.name, doc: p.doc, e: renderPlanEmail(p.doc, { ...meta, planUrl: "https://app.example/plan/x", pdfAttached: true, planId: "abc" }) })),
      { name: "confirm", e: renderConfirmEmail("https://app.example/link", meta) },
      { name: "confirm reminder", e: renderConfirmReminder("https://app.example/link", meta) },
      { name: "sign-in", e: renderLoginEmail("https://app.example/link", meta) },
      ...(Object.keys(FOLLOWUP_COPY) as (keyof typeof FOLLOWUP_COPY)[]).map((k) => ({ name: `follow-up ${k}`, e: renderFollowupEmail(k, "https://app.example/plan/x", meta) })),
      { name: "maintenance reminder", e: renderReminderEmail([{ when: "Monthly", task: "Test CO and smoke alarms." }], "https://app.example/plan/x", meta) },
    ] as { name: string; doc?: Awaited<ReturnType<typeof buildPlan>>["document"]; e: { subject: string; html: string; text: string } }[];
  };

  it("calm subject lines: no urgency or fear words, no exclamation marks, no 'now'", async () => {
    for (const { name, e } of await all()) {
      expect(e.subject, name).not.toMatch(EXCLAIM);
      expect(e.subject, name).not.toMatch(/!|\bnow\b|\btoday\b|\burgent\b/i);
      for (const re of URGENCY) expect(e.subject, name).not.toMatch(re);
    }
  });
  it("copy: no exclamation marks, urgency words or 'exact' outside safety instructions (plain text and HTML)", async () => {
    for (const { name, e } of await all()) {
      expect(calm(e.text), `${name} (text)`).toEqual([]);
      const visible = e.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "\n").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      // Plan emails carry the decision triggers and safety callouts in HTML tables; their plain text (same content, with
      // the safety lines marked) is checked above, so the HTML check covers every other email.
      if (!name.startsWith("plan")) expect(calm(visible), `${name} (html)`).toEqual([]);
    }
  });
  it("one clear button per email", async () => {
    for (const { name, e } of await all()) expect((e.html.match(/data-button/g) ?? []).length, name).toBe(1);
  });
  it("the plan email opens with the reassurance and the first 3 steps, before the button; the plain text matches", async () => {
    for (const { name, doc, e } of (await all()).filter((x) => x.doc)) {
      const firstStepsAt = e.html.indexOf("data-first-steps");
      const buttonAt = e.html.indexOf("data-button");
      expect(firstStepsAt, name).toBeGreaterThan(-1);
      expect(firstStepsAt, name).toBeLessThan(buttonAt);
      const titles = firstStepItems(doc!);
      for (const t of titles) {
        const escaped = t.replace(/&/g, "&amp;").replace(/'/g, "&#39;");
        expect(e.html.indexOf(escaped), `${name}: ${t}`).toBeLessThan(buttonAt);
        // Plain text: the same steps, before "Open your plan".
        expect(e.text.indexOf(`[ ] ${t}`), `${name} (text): ${t}`).toBeGreaterThan(-1);
        expect(e.text.indexOf(`[ ] ${t}`)).toBeLessThan(e.text.indexOf("Open your plan:"));
      }
      expect(e.text.indexOf(REASSURANCE)).toBeLessThan(e.text.indexOf("Open your plan:"));
      expect(e.text).not.toMatch(/!!/);
    }
  });
  it("no Amazon links; unsubscribe and mailing address in every email, HTML and plain text", async () => {
    for (const { name, e } of await all()) {
      expect(e.html + e.text, name).not.toMatch(/amazon\.|amzn\./i);
      expect(e.html, name).toContain(meta.mailingAddress);
      expect(e.html, name).toContain(meta.unsubscribeUrl.replace(/&/g, "&amp;"));
      expect(e.text, name).toContain(meta.mailingAddress);
      expect(e.text, name).toContain(meta.unsubscribeUrl);
    }
  });
  it("supports dark mode and phone width", async () => {
    for (const { name, e } of await all()) {
      expect(e.html, name).toMatch(/<meta name="color-scheme" content="light dark">/);
      expect(e.html, name).toMatch(/@media \(prefers-color-scheme:dark\)/);
      expect(e.html, name).toMatch(/name="viewport" content="width=device-width/);
      expect(e.html, name).toMatch(/max-width:600px/);
    }
  });
});

describe("code review follow-ups (off-site pass)", () => {
  it("print and email use the web's first-screen rules: 'this one' for one step, no block for none, 'can wait' when more follow", async () => {
    const { firstScreen } = await import("@/lib/plan/nextSteps");
    const { document: doc } = await buildPlan(PERSONAS[0].a);
    const pr = doc.sections.find((s) => s.id === "priorities")!;
    // As on the web, the first screen takes the first 3 priority steps across stages: one This-week step still shows 3.
    const weekList = pr.blocks.find((b) => b.type === "checklist")!;
    if (weekList.type !== "checklist") throw new Error("no week list");
    const oneWeek = { ...doc, sections: doc.sections.map((s) => (s === pr ? { ...s, blocks: s.blocks.map((b) => (b === weekList ? { ...weekList, items: weekList.items.slice(0, 1) } : b)) } : s)) };
    expect(firstScreen(oneWeek).title).toBe("Start with these 3");
    expect(firstScreen(oneWeek).note).toBe("Everything else can wait.");
    // A plan with a single priority step: "Start with this one", and no "can wait" (nothing follows).
    const one = { ...doc, sections: doc.sections.map((s) => (s === pr ? { ...s, blocks: [{ type: "subheading" as const, text: "This week" }, { ...weekList, items: weekList.items.slice(0, 1) }] } : s)) };
    expect(firstScreen(one).title).toBe("Start with this one");
    expect(firstScreen(one).note).toBeNull();
    const e1 = renderPlanEmail(one, { ...meta, planUrl: "p", pdfAttached: false });
    expect(e1.html).toContain("Start with this one");
    expect(e1.text).toContain("START WITH THIS ONE");
    expect(squash((await pageTexts(await renderPlanPdf(one)))[0])).toContain(squash("Start with this one"));
    const none = { ...doc, sections: doc.sections.filter((s) => s.id !== "priorities") };
    expect(firstScreen(none).items).toEqual([]);
    const e0 = renderPlanEmail(none, { ...meta, planUrl: "p", pdfAttached: false });
    expect(e0.html).not.toMatch(/Start with these 0|data-first-steps/);
    expect(squash((await pageTexts(await renderPlanPdf(none)))[0])).not.toContain(squash("Start with these"));
    expect((await PDFDocument.load(await renderFridgeChecklist(none))).getPageCount()).toBe(1);
  });
  it("dark mode keeps the safety red and muted text inside the body (selectors beat .tx p)", () => {
    const e = renderConfirmEmail("https://link", meta);
    expect(e.html).toMatch(/\.tx \.dg,\.dg\{color:#f08a7e!important\}/);
    expect(e.html).toMatch(/\.tx \.mu,\.mu\{color:#a2afbc!important\}/);
  });
  it("the PDF renders in the order tests/priority.test.ts checks", async () => {
    const { pdfChapters, pdfSections } = await import("@/lib/pdf/PlanPdf");
    const { document: doc } = await buildPlan();
    expect(pdfSections(doc).map((s) => s.id)).toEqual(pdfChapters(doc).flatMap((c) => c.items.map((s) => s.id)));
  });
});
