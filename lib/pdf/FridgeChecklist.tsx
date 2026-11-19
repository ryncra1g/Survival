import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { CO_RULE } from "@/lib/safety/required";
import { pdfSafe } from "./PlanPdf";
import { BRAND } from "@/lib/brand";

/** One-page "put it on the fridge" sheet: this week's steps, Day 0 checklist, key decisions, contacts. */
const ink = "#1c2430";
const brand = "#b3471d";
const muted = "#5b6573";
const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: ink, lineHeight: 1.3 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 2, borderBottomColor: brand, paddingBottom: 4, marginBottom: 8 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", lineHeight: 1.1 },
  sub: { fontSize: 8.5, color: muted },
  cols: { flexDirection: "row", gap: 14 },
  col: { flex: 1 },
  h: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: brand, marginTop: 6, marginBottom: 3 },
  row: { flexDirection: "row", marginVertical: 1.6 },
  box: { width: 7.5, height: 7.5, flexShrink: 0, borderWidth: 1, borderColor: ink, marginRight: 5, marginTop: 1.5 },
  ifthen: { marginVertical: 1.6 },
  bold: { fontFamily: "Helvetica-Bold" },
  line: { borderBottomWidth: 0.75, borderBottomColor: muted, height: 14, marginBottom: 2 },
  co: { marginTop: 8, padding: 6, borderWidth: 1.5, borderColor: "#a1261b", fontSize: 8 },
});

const checklist = (doc: PlanDocument, sectionId: string, nth = 0) => {
  const blocks = doc.sections.find((x) => x.id === sectionId)?.blocks.filter((b): b is Extract<Block, { type: "checklist" }> => b.type === "checklist") ?? [];
  return blocks[nth]?.items.map((i) => i.text) ?? [];
};
const ifthen = (doc: PlanDocument) => {
  const b = doc.sections.find((x) => x.id === "day0")?.blocks.find((x): x is Extract<Block, { type: "ifthen" }> => x.type === "ifthen");
  return b?.rows ?? [];
};

function Checks({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={s.row} wrap={false}>
          <View style={s.box} />
          <Text style={{ flex: 1 }}>{pdfSafe(t)}</Text>
        </View>
      ))}
    </View>
  );
}

export function FridgeChecklist({ doc }: { doc: PlanDocument }) {
  const week = checklist(doc, "priorities", 0).slice(0, 8);
  const day0 = checklist(doc, "day0", 0).slice(0, 9);
  const triggers = ifthen(doc).slice(0, 7);
  return (
    <Document title={`${BRAND.name} fridge checklist`} author={BRAND.name}>
      <Page size="LETTER" style={s.page}>
        <View style={s.top}>
          <Text style={s.title}>Emergency checklist</Text>
          <Text style={s.sub}>{pdfSafe(doc.subtitle)}</Text>
        </View>
        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.h}>This week</Text>
            <Checks items={week} />
            <Text style={s.h}>When a storm or outage is coming</Text>
            <Checks items={day0} />
          </View>
          <View style={s.col}>
            <Text style={s.h}>If… then…</Text>
            {triggers.map((r, i) => (
              <Text key={i} style={s.ifthen}>
                <Text style={s.bold}>If {pdfSafe(r.if.charAt(0).toLowerCase() + r.if.slice(1))}: </Text>
                {pdfSafe(r.then)}
              </Text>
            ))}
            <Text style={s.h}>Our contacts</Text>
            {["Out-of-area contact", "Meeting place near home", "Meeting place outside the neighborhood", "Doctor / pharmacy", "Vet", "Utility outage line"].map((l) => (
              <View key={l}>
                <Text style={{ color: muted, fontSize: 7.5 }}>{l}</Text>
                <View style={s.line} />
              </View>
            ))}
          </View>
        </View>
        <Text style={s.co}>
          <Text style={[s.bold, { color: "#a1261b" }]}>Carbon monoxide: </Text>
          {pdfSafe(CO_RULE)}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 7, color: muted }}>{pdfSafe(doc.disclaimer)}</Text>
      </Page>
    </Document>
  );
}

export async function renderFridgeChecklist(doc: PlanDocument): Promise<Buffer> {
  return renderToBuffer(<FridgeChecklist doc={doc} />);
}
