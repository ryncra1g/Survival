import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { BRAND } from "@/lib/brand";
import { KIND_LABEL, kindLabelsAt } from "@/lib/plan/kinds";

/** Server-side PDF of the same PlanDocument structure. Uses built-in Helvetica (no font fetch). */
const ink = "#1c2430";
const muted = "#5b6573";
const line = "#d5dae0";
const brand = "#b3471d";
const tone = { danger: "#a1261b", warning: "#8a5a00", info: "#1f4f7a" };

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 9.5, fontFamily: "Helvetica", color: ink, lineHeight: 1.35 },
  brand: { fontSize: 11, color: brand, fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 6, lineHeight: 1.2 },
  sub: { fontSize: 10, color: muted, marginTop: 2, marginBottom: 10 },
  disclaimer: { fontSize: 8.5, color: muted, borderWidth: 1, borderColor: line, padding: 6, marginBottom: 8 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 3, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: line },
  summary: { fontSize: 10, backgroundColor: "#fbf3ea", padding: 6, marginBottom: 6 },
  p: { marginVertical: 3 },
  subheading: { fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginVertical: 1.5 },
  bulletDot: { width: 10 },
  checkRow: { flexDirection: "row", marginVertical: 2, alignItems: "flex-start" },
  box: { width: 8, height: 8, flexShrink: 0, borderWidth: 1, borderColor: ink, marginRight: 6, marginTop: 1.5 },
  caption: { fontFamily: "Helvetica-Bold", color: muted, fontSize: 8.5, marginTop: 6, marginBottom: 2 },
  table: { borderTopWidth: 1, borderTopColor: line, marginVertical: 3 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: line },
  th: { fontFamily: "Helvetica-Bold", backgroundColor: "#f4f4f1" },
  td: { padding: 3, flexGrow: 1, flexShrink: 1, width: 1 },
  callout: { borderLeftWidth: 3, backgroundColor: "#faf8f5", padding: 6, marginVertical: 4 },
  kind: { fontFamily: "Helvetica-Bold", fontSize: 7, color: muted, marginTop: 6, marginBottom: 1, letterSpacing: 0.5 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7.5, color: muted, textAlign: "center" },
});

/** Helvetica only covers WinAnsi; map the few symbols we use that it lacks. */
export const pdfSafe = (t: string) => t.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/→/g, "->").replace(/☐/g, "[ ]").replace(/[  ]/g, " ");

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
                {it.link ? <Text style={{ color: tone.info, fontSize: 8.5 }}>{`\n${pdfSafe(it.link.label)}: ${it.link.url}`}</Text> : null}
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
            <Text key={l.url} style={{ fontSize: 8.5, color: tone.info }}>{`${pdfSafe(l.label)}: ${l.url}`}</Text>
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
      return (
        <View style={[s.callout, { borderLeftColor: tone[b.tone] }]} wrap={false}>
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: tone[b.tone] }}>{pdfSafe(b.title)}. </Text>
            {pdfSafe(b.text)}
          </Text>
        </View>
      );
  }
}

/**
 * UX-7: the PDF follows the web order: the Priority list ("This week" first) on page 1, then the rest of the plan.
 * Sections keep the plan's own numbers, because the text refers to them ("section 5").
 */
export function pdfSections(doc: PlanDocument): PlanDocument["sections"] {
  const first = doc.sections.filter((s) => s.id === "priorities");
  return [...first, ...doc.sections.filter((s) => s.id !== "priorities")];
}

export function PlanPdf({ doc, diyTips = false }: { doc: PlanDocument; diyTips?: boolean }) {
  return (
    <Document title={doc.title} author={BRAND.name} subject="Emergency preparedness plan">
      <Page size="LETTER" style={s.page} wrap>
        <Text style={s.brand}>{BRAND.name}</Text>
        <Text style={s.h1}>{pdfSafe(doc.title)}</Text>
        <Text style={s.sub}>{pdfSafe(doc.subtitle)} · Generated {doc.generatedAt.slice(0, 10)}</Text>
        <Text style={{ fontSize: 8, color: muted, marginBottom: 6 }}>General guidance, not professional advice. Full disclaimer and sources at the end.</Text>
        {pdfSections(doc).map((sec) => (
          <View key={sec.id}>
            <Text style={s.h2} minPresenceAhead={60}>
              {sec.number}. {pdfSafe(sec.title)}
            </Text>
            <Text style={s.summary}>{pdfSafe(sec.summary)}</Text>
            {(() => {
              const labels = kindLabelsAt(sec.blocks);
              return sec.blocks.map((b, i) => (
                <View key={i}>
                  {labels[i] && <Text style={s.kind}>{KIND_LABEL[labels[i]].toUpperCase()}</Text>}
                  {b.type === "tips" ? diyTips && <TipsPdf b={b} /> : <BlockView b={b} />}
                </View>
              ));
            })()}
          </View>
        ))}
        <Text style={s.h2}>Sources &amp; disclaimers</Text>
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
    const size = 7.5;
    const { width } = page.getSize();
    page.drawText(label, { x: width - 36 - font.widthOfTextAtSize(label, size), y: 25.5, size, font, color: rgb(0.36, 0.4, 0.45) });
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
      {b.dontDo.length > 0 && <Text style={s.p}>{pdfSafe(`Don't do this: ${b.dontDo.join(" ")}`)}</Text>}
    </View>
  );
}

export async function renderPlanPdf(doc: PlanDocument, opts: { diyTips?: boolean } = {}): Promise<Buffer> {
  return addPageNumbers(await renderToBuffer(<PlanPdf doc={doc} diyTips={!!opts.diyTips} />));
}
