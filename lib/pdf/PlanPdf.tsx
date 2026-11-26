import React from "react";
import { Document, Font, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { BRAND } from "@/lib/brand";
import { KIND_LABEL, kindLabelsAt } from "@/lib/plan/kinds";
import { CHAPTER_ICON, ICON_PATHS, SECTION_ICON, type IconName } from "@/lib/icons";
import { groupIntoChapters } from "@/lib/plan/chapters";
import { REASSURANCE, START_WITH } from "@/lib/plan/nextSteps";
import { STAGE } from "@/lib/plan/priority";

/**
 * Server-side PDF of the same PlanDocument structure. Uses built-in Helvetica (no font fetch).
 * Off-site design pass: page 1 mirrors the web's first screen; chapters and icons as on the web; 11pt body text with
 * more white space; prints well in black and white (dark ink, light tints, callouts marked by weight and a label).
 */
// No hyphenation: "batter-ies" is harder to read at arm's length (the fridge sheet imports this module too).
Font.registerHyphenationCallback((word) => [word]);

const ink = "#14202c";
const muted = "#4a5663";
const line = "#cfd5dc";
const brand = "#1e3a5c";
const tint = "#eef2f6";
const tone = { danger: "#7a1d14", warning: "#5c3a00", info: "#1e3a5c" };

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 54, fontSize: 11, fontFamily: "Helvetica", color: ink, lineHeight: 1.5 },
  brand: { fontSize: 11, color: brand, fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4, lineHeight: 1.2 },
  sub: { fontSize: 11, color: muted, marginTop: 2, marginBottom: 4 },
  disclaimer: { fontSize: 9.5, color: muted, borderWidth: 1, borderColor: line, padding: 8, marginBottom: 10 },
  reassure: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 4, lineHeight: 1.35 },
  start: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 2 },
  startNote: { fontSize: 11, color: muted, marginBottom: 6 },
  card: { borderWidth: 1, borderColor: line, borderRadius: 6, padding: 10, marginVertical: 5 },
  cardTitle: { fontSize: 12.5, fontFamily: "Helvetica-Bold", lineHeight: 1.35 },
  how: { fontSize: 10.5, marginTop: 3 },
  howLabel: { fontFamily: "Helvetica-Bold", color: muted, fontSize: 8.5, letterSpacing: 0.4, marginTop: 5 },
  week: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 4 },
  chapter: { flexDirection: "row", alignItems: "center", marginTop: 26, marginBottom: 2, paddingTop: 10, borderTopWidth: 2, borderTopColor: brand },
  chapterText: { fontSize: 20, fontFamily: "Helvetica-Bold", color: brand, marginLeft: 8 },
  h2: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 6 },
  h2Text: { fontSize: 15, fontFamily: "Helvetica-Bold", marginLeft: 6 },
  summary: { fontSize: 11, backgroundColor: tint, padding: 10, marginBottom: 8, borderRadius: 4 },
  p: { marginVertical: 4 },
  subheading: { fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 3 },
  bulletRow: { flexDirection: "row", marginVertical: 2 },
  bulletDot: { width: 12 },
  checkRow: { flexDirection: "row", marginVertical: 3, alignItems: "flex-start" },
  box: { width: 10, height: 10, flexShrink: 0, borderWidth: 1.2, borderColor: ink, marginRight: 8, marginTop: 3 },
  caption: { fontFamily: "Helvetica-Bold", color: muted, fontSize: 10, marginTop: 8, marginBottom: 3 },
  table: { borderTopWidth: 1, borderTopColor: line, marginVertical: 4, fontSize: 10 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: line },
  th: { fontFamily: "Helvetica-Bold", backgroundColor: tint },
  td: { padding: 4, flexGrow: 1, flexShrink: 1, width: 1 },
  callout: { borderLeftWidth: 2, borderColor: ink, backgroundColor: tint, padding: 8, marginVertical: 6 },
  kind: { fontFamily: "Helvetica-Bold", fontSize: 8, color: muted, marginTop: 8, marginBottom: 2, letterSpacing: 0.5 },
  link: { color: tone.info, fontSize: 9.5 },
  footer: { position: "absolute", bottom: 24, left: 54, right: 54, fontSize: 8.5, color: muted, textAlign: "center" },
});

/** Helvetica only covers WinAnsi; map the few symbols we use that it lacks. */
export const pdfSafe = (t: string) => t.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/→/g, "->").replace(/☐/g, "[ ]").replace(/[  ]/g, " ");

function Table({ columns, rows, widths }: { columns: string[]; rows: string[][]; widths?: number[] }) {
  const w = (i: number) => (widths ? { flexGrow: widths[i] } : {});
  return (
    <View style={s.table}>
      <View style={[s.tr, s.th]} wrap={false} minPresenceAhead={40}>
        {columns.map((c, i) => (
          <Text key={i} style={[s.td, w(i)]}>{pdfSafe(c)}</Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          {r.map((cell, ci) => (
            <Text key={ci} style={[s.td, w(ci)]}>{pdfSafe(cell)}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "paragraph":
      return <Text style={s.p}>{pdfSafe(b.text)}</Text>;
    case "subheading":
      return <Text style={s.subheading}>{pdfSafe(b.text)}</Text>;
    case "bullets":
      return (
        <View>
          {b.items.map((t, i) => (
            <View key={i} style={s.bulletRow} wrap={false}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={{ flex: 1 }}>{pdfSafe(t)}</Text>
            </View>
          ))}
        </View>
      );
    case "checklist":
      return (
        <View>
          {b.items.map((it) => (
            <View key={it.id} style={s.checkRow} wrap={false}>
              <View style={s.box} />
              <Text style={{ flex: 1 }}>
                {pdfSafe(it.text)}
                {it.link ? <Text style={s.link}>{`\n${pdfSafe(it.link.label)}: ${it.link.url}`}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      );
    case "table": {
      const widths = b.columns.length === 4 && b.columns[1] === "Look for" ? [3, 5, 3, 2] : b.columns.length === 2 ? [2, 5] : undefined;
      return (
        <View>
          {b.caption ? <Text style={s.caption} minPresenceAhead={60}>{pdfSafe(b.caption)}</Text> : null}
          <Table columns={b.columns} rows={b.rows} widths={widths} />
        </View>
      );
    }
    case "ifthen":
      return <Table columns={["If…", "Then…"]} rows={b.rows.map((r) => [r.if, r.then])} widths={[4, 5]} />;
    case "products":
      return (
        <View>
          {b.caption ? <Text style={s.caption} minPresenceAhead={60}>{pdfSafe(b.caption)}</Text> : null}
          <Table
            columns={["Item", "Look for", "Examples", "Price"]}
            rows={b.items.map((i) => [
              `${i.category}: ${i.name}${i.qty ? ` ${i.qty}` : ""}${i.later ? " (when budget allows)" : ""}`,
              i.spec + (i.levels ? `\nLevels: ${i.levels.map((l) => `${l.selected ? "[x] " : ""}${l.level[0].toUpperCase() + l.level.slice(1)} ${l.price}`).join(" · ")}` : ""),
              i.models.join("; "),
              i.price,
            ])}
            widths={[3, 5, 3, 2]}
          />
        </View>
      );
    case "help":
      return b.links.length || b.note ? (
        <View wrap={false} style={{ marginTop: 6 }}>
          <Text style={s.caption}>What you need</Text>
          {b.note ? <Text style={s.p}>{pdfSafe(b.note)}</Text> : null}
          {b.links.map((l) => (
            <Text key={l.url} style={s.link}>{`${pdfSafe(l.label)}: ${l.url}`}</Text>
          ))}
        </View>
      ) : null;
    case "levelchoice":
      return (
        <View>
          <Text style={s.caption} minPresenceAhead={60}>{pdfSafe(b.caption)}</Text>
          {b.levels.map((l) => (
            <Text key={l.level} style={s.p}>{l.selected ? "[x] " : "[ ] "}{pdfSafe(l.name)}: {pdfSafe(l.price)}</Text>
          ))}
        </View>
      );
    case "callout":
      // Black-and-white safe: a safety warning is marked by a thick rule and a "SAFETY" label, not by its color.
      return (
        <View style={[s.callout, { borderLeftColor: tone[b.tone], borderLeftWidth: b.tone === "danger" ? 5 : 2 }]} wrap={false}>
          {b.tone === "danger" ? <Text style={[s.kind, { marginTop: 0 }]}>SAFETY</Text> : null}
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: tone[b.tone] }}>{pdfSafe(b.title)}. </Text>
            {pdfSafe(b.text)}
          </Text>
        </View>
      );
  }
}

/**
 * UX-7 / off-site pass: the PDF follows the web's chapter order (Do now, Supplies, Power & heat, People & plans), so the
 * Priority list comes first. Sections keep the plan's own numbers, because the text refers to them ("section 5").
 */
export function pdfSections(doc: PlanDocument): PlanDocument["sections"] {
  return groupIntoChapters(doc.sections).flatMap((ch) => ch.items);
}

/** The same line icon as on the web (lib/icons.ts), in the brand blue (prints dark grey in black and white). */
function PdfIcon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      <Path d={ICON_PATHS[name]} stroke={brand} strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Item = Extract<Block, { type: "checklist" }>["items"][number];
/** "This week" in plan order: the priority list's first checklist after the "This week" heading. */
export function weekItems(doc: PlanDocument): Item[] {
  const blocks = doc.sections.find((x) => x.id === "priorities")?.blocks ?? [];
  const at = blocks.findIndex((b) => b.type === "subheading" && b.text === STAGE.week);
  const list = blocks.slice(at + 1).find((b) => b.type === "checklist");
  return at >= 0 && list?.type === "checklist" ? list.items : [];
}

/** Page 1: the web's first screen on paper. The reassurance, the first 3 with their how-to, then the rest of This week. */
function FirstPage({ doc }: { doc: PlanDocument }) {
  const week = weekItems(doc);
  const first = week.slice(0, START_WITH);
  const rest = week.slice(START_WITH);
  return (
    <View>
      <Text style={s.reassure}>{REASSURANCE}</Text>
      <Text style={s.start}>Start with these {first.length}</Text>
      {rest.length > 0 ? <Text style={s.startNote}>Everything else can wait.</Text> : null}
      {first.map((it) => (
        <View key={it.id} style={s.card} wrap={false}>
          <View style={{ flexDirection: "row" }}>
            <View style={[s.box, { width: 12, height: 12, marginTop: 2.5 }]} />
            <Text style={[s.cardTitle, { flex: 1 }]}>{pdfSafe(it.title ?? it.text)}</Text>
          </View>
          <View style={{ marginLeft: 20 }}>
            <Text style={s.howLabel}>HOW TO DO IT</Text>
            {it.title && it.title !== it.text ? <Text style={s.how}>{pdfSafe(it.text)}</Text> : null}
            {it.why ? <Text style={[s.how, { color: muted }]}>{pdfSafe(it.why)}</Text> : null}
            {it.link ? <Text style={[s.link, { marginTop: 3 }]}>{`${pdfSafe(it.link.label)}: ${it.link.url}`}</Text> : null}
          </View>
        </View>
      ))}
      {rest.length > 0 ? (
        <View>
          <Text style={s.week}>The rest of {STAGE.week.toLowerCase()}</Text>
          {rest.map((it) => (
            <View key={it.id} style={s.checkRow} wrap={false}>
              <View style={s.box} />
              <Text style={{ flex: 1 }}>
                {pdfSafe(it.text)}
                {it.link ? <Text style={s.link}>{`\n${pdfSafe(it.link.label)}: ${it.link.url}`}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The priority list without its This week part, which is on page 1. */
function withoutWeek(blocks: Block[]): Block[] {
  const at = blocks.findIndex((b) => b.type === "subheading" && b.text === STAGE.week);
  if (at < 0) return blocks;
  const listAt = blocks.findIndex((b, i) => i > at && b.type === "checklist");
  return [...blocks.slice(0, at), { type: "paragraph", text: "This week's steps are at the start of this plan." }, ...blocks.slice(listAt + 1)];
}

export function PlanPdf({ doc, diyTips = false }: { doc: PlanDocument; diyTips?: boolean }) {
  return (
    <Document title={doc.title} author={BRAND.name} subject="Emergency preparedness plan">
      <Page size="LETTER" style={s.page} wrap>
        <Text style={s.brand}>{BRAND.name}</Text>
        <Text style={s.h1}>{pdfSafe(doc.title)}</Text>
        <Text style={s.sub}>{pdfSafe(doc.subtitle)} · Generated {doc.generatedAt.slice(0, 10)}</Text>
        <Text style={{ fontSize: 9.5, color: muted }}>General guidance, not professional advice. Full disclaimer and sources at the end.</Text>
        <FirstPage doc={doc} />
        {groupIntoChapters(doc.sections).map((ch, ci) => (
          // The plan proper starts on a new page, after the first-steps page.
          <View key={ch.id} break={ci === 0}>
            <View style={s.chapter} minPresenceAhead={80}>
              <PdfIcon name={CHAPTER_ICON[ch.id] ?? "checklist"} size={20} />
              <Text style={s.chapterText}>{ch.title}</Text>
            </View>
            {ch.items.map((sec) => {
              const blocks = sec.id === "priorities" ? withoutWeek(sec.blocks) : sec.blocks;
              const labels = kindLabelsAt(blocks);
              return (
                <View key={sec.id}>
                  <View style={s.h2} minPresenceAhead={60}>
                    {SECTION_ICON[sec.id] ? <PdfIcon name={SECTION_ICON[sec.id]} /> : null}
                    <Text style={s.h2Text}>
                      {sec.number}. {pdfSafe(sec.title)}
                    </Text>
                  </View>
                  <Text style={s.summary}>{pdfSafe(sec.summary)}</Text>
                  {blocks.map((b, i) => (
                    <View key={i}>
                      {labels[i] ? <Text style={s.kind}>{KIND_LABEL[labels[i]].toUpperCase()}</Text> : null}
                      {b.type === "tips" ? diyTips && <TipsPdf b={b} /> : <BlockView b={b} />}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ))}
        <Text style={[s.h2Text, { marginTop: 24, marginLeft: 0 }]}>Sources &amp; disclaimers</Text>
        <Text style={s.disclaimer}>{pdfSafe(doc.disclaimer)}</Text>
        {doc.affiliateDisclosure ? <Text style={s.disclaimer}>Affiliate disclosure: {pdfSafe(doc.affiliateDisclosure)}</Text> : null}
        {doc.sources.map((src) => (
          <Text key={src.url} style={s.p}>
            {src.name} — {src.url}
          </Text>
        ))}
        <Text style={s.footer} fixed>{BRAND.name} · General guidance, not professional advice</Text>
      </Page>
    </Document>
  );
}

/**
 * Stamps "Page X of Y" on every page after rendering. react-pdf 4.9's dynamic `render` prop either
 * crashes ("unsupported number") or draws nothing in a long wrapped document, so we post-process instead.
 */
export async function addPageNumbers(pdf: Uint8Array): Promise<Buffer> {
  const out = await PDFDocument.load(pdf, { updateMetadata: false });
  const font = await out.embedFont(StandardFonts.Helvetica);
  const pages = out.getPages();
  pages.forEach((page, i) => {
    const label = `Page ${i + 1} of ${pages.length}`;
    const size = 8.5;
    const { width } = page.getSize();
    page.drawText(label, { x: width - 54 - font.widthOfTextAtSize(label, size), y: 24, size, font, color: rgb(0.29, 0.34, 0.39) });
  });
  return Buffer.from(await out.save());
}

/** D3b tips box; rendered only when DIY_TIPS_ENABLED is on (the caller passes it). */
function TipsPdf({ b }: { b: Extract<Block, { type: "tips" }> }) {
  return (
    <View style={s.callout}>
      <Text style={s.subheading}>No time to buy? Use what you have</Text>
      {b.tips.map((t) => (
        <Text key={t.id} style={s.p}>
          {pdfSafe(`${t.situation} ${t.steps.join(" ")} (${t.source.label}: ${t.source.url})`)}
        </Text>
      ))}
      {b.dontDo.length > 0 ? <Text style={s.p}>{pdfSafe(`Don't do this: ${b.dontDo.join(" ")}`)}</Text> : null}
    </View>
  );
}

export async function renderPlanPdf(doc: PlanDocument, opts: { diyTips?: boolean } = {}): Promise<Buffer> {
  return addPageNumbers(await renderToBuffer(<PlanPdf doc={doc} diyTips={!!opts.diyTips} />));
}
