import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { CO_RULE } from "@/lib/safety/required";
import { pdfSafe, weekItems } from "./PlanPdf";
import { BRAND } from "@/lib/brand";
import { START_WITH } from "@/lib/plan/nextSteps";

/**
 * One-page "put it on the fridge" sheet (off-site design pass), readable from arm's length and black-and-white safe:
 * the first 3 steps, the key amounts, emergency contacts with blanks to fill in, and the Day 0 essentials.
 * Large type, real checkboxes, black ink on white; nothing relies on color. tests/offsite.test.ts checks it is
 * exactly one page for every persona.
 */
const ink = "#111111";
const muted = "#444444";
export const DAY0_ON_FRIDGE = 6;

const s = StyleSheet.create({
  page: { paddingVertical: 34, paddingHorizontal: 40, fontSize: 12, fontFamily: "Helvetica", color: ink, lineHeight: 1.35 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: ink, paddingBottom: 6, marginBottom: 10 },
  title: { fontSize: 26, fontFamily: "Helvetica-Bold", lineHeight: 1.1 },
  sub: { fontSize: 10.5, color: muted, maxWidth: 230, textAlign: "right" },
  h: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 5 },
  row: { flexDirection: "row", marginVertical: 3, alignItems: "flex-start" },
  bigBox: { width: 16, height: 16, flexShrink: 0, borderWidth: 1.8, borderColor: ink, marginRight: 10, marginTop: 1 },
  box: { width: 12, height: 12, flexShrink: 0, borderWidth: 1.4, borderColor: ink, marginRight: 8, marginTop: 2 },
  first: { fontSize: 15, fontFamily: "Helvetica-Bold", flex: 1 },
  amounts: { flexDirection: "row", gap: 8, marginTop: 2 },
  amount: { flex: 1, borderWidth: 1.2, borderColor: ink, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8 },
  amountValue: { fontSize: 19, fontFamily: "Helvetica-Bold", lineHeight: 1.15 },
  amountLabel: { fontSize: 10.5, color: muted },
  cols: { flexDirection: "row", gap: 18 },
  col: { flex: 1 },
  contactLabel: { fontSize: 10.5, color: muted, marginTop: 6 },
  blank: { borderBottomWidth: 1, borderBottomColor: ink, height: 20 },
  co: { marginTop: 12, padding: 8, borderWidth: 2.5, borderColor: ink, fontSize: 10.5, lineHeight: 1.35 },
  bold: { fontFamily: "Helvetica-Bold" },
  disclaimer: { marginTop: 6, fontSize: 8, color: muted, lineHeight: 1.3 },
});

const firstChecklist = (doc: PlanDocument, sectionId: string) =>
  doc.sections.find((x) => x.id === sectionId)?.blocks.find((b): b is Extract<Block, { type: "checklist" }> => b.type === "checklist")?.items ?? [];

/** What goes on the sheet, in order. Exported so tests can check it against the plan. */
export function fridgeContent(doc: PlanDocument) {
  const first = weekItems(doc).slice(0, START_WITH).map((i) => i.title ?? i.text);
  const amounts = (doc.overview?.stats ?? []).filter((st) => ["water", "food", "fuel", "cash"].includes(st.key)).map((st) => ({ value: st.value, label: st.label }));
  const day0 = firstChecklist(doc, "day0").slice(0, DAY0_ON_FRIDGE).map((i) => i.text);
  const pets = doc.sections.some((x) => x.id === "pets");
  const contacts = ["Out-of-area contact", "Meeting place near home", "Meeting place outside the neighborhood", "Doctor / pharmacy", ...(pets ? ["Vet"] : []), "Utility outage line"];
  return { first, amounts, day0, contacts };
}

export function FridgeChecklist({ doc }: { doc: PlanDocument }) {
  const { first, amounts, day0, contacts } = fridgeContent(doc);
  return (
    <Document title={`${BRAND.name} fridge checklist`} author={BRAND.name}>
      <Page size="LETTER" style={s.page}>
        <View style={s.top}>
          <Text style={s.title}>Emergency checklist</Text>
          <Text style={s.sub}>{pdfSafe(doc.subtitle)}</Text>
        </View>

        <Text style={[s.h, { marginTop: 2 }]}>Start with these {first.length}</Text>
        {first.map((t, i) => (
          <View key={i} style={s.row} wrap={false}>
            <View style={s.bigBox} />
            <Text style={s.first}>{pdfSafe(t)}</Text>
          </View>
        ))}

        {amounts.length > 0 && (
          <View wrap={false}>
            <Text style={s.h}>Key amounts</Text>
            <View style={s.amounts}>
              {amounts.map((a) => (
                <View key={a.label} style={s.amount}>
                  <Text style={s.amountValue}>{pdfSafe(a.value)}</Text>
                  <Text style={s.amountLabel}>{pdfSafe(a.label)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.h}>When a storm or outage is coming</Text>
            {day0.map((t, i) => (
              <View key={i} style={s.row} wrap={false}>
                <View style={s.box} />
                <Text style={{ flex: 1 }}>{pdfSafe(t)}</Text>
              </View>
            ))}
          </View>
          <View style={s.col}>
            <Text style={s.h}>Emergency contacts</Text>
            {contacts.map((l) => (
              <View key={l} wrap={false}>
                <Text style={s.contactLabel}>{l}</Text>
                <View style={s.blank} />
              </View>
            ))}
          </View>
        </View>

        <View style={s.co} wrap={false}>
          <Text>
            <Text style={s.bold}>Carbon monoxide: </Text>
            {pdfSafe(CO_RULE)}
          </Text>
        </View>
        <Text style={s.disclaimer}>{pdfSafe(doc.disclaimer)}</Text>
      </Page>
    </Document>
  );
}

export async function renderFridgeChecklist(doc: PlanDocument): Promise<Buffer> {
  return renderToBuffer(<FridgeChecklist doc={doc} />);
}
