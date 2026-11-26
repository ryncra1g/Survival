import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream, type PDFPage } from "pdf-lib";

/**
 * The text drawn on one PDF page, for tests. react-pdf (pdfkit) writes built-in Helvetica text as hex strings inside
 * TJ arrays, split wherever it kerns; joining the hex strings of one TJ gives the run's text. Runs are joined with a
 * space, so a title split over two lines still matches once whitespace is collapsed.
 */
export async function pageTexts(pdf: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(pdf);
  return doc.getPages().map(pageText);
}

function contentOf(page: PDFPage): string {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map((r) => page.doc.context.lookup(r)) : [contents];
  return streams
    .filter((s): s is PDFRawStream => s instanceof PDFRawStream)
    .map((s) => Buffer.from(decodePDFRawStream(s).decode()).toString("latin1"))
    .join("\n");
}

function pageText(page: PDFPage): string {
  const runs: string[] = [];
  for (const m of contentOf(page).matchAll(/\[((?:<[0-9a-fA-F]*>|[^\]])*)\]\s*TJ|<([0-9a-fA-F]*)>\s*Tj/g)) {
    const hex = m[1] !== undefined ? [...m[1].matchAll(/<([0-9a-fA-F]*)>/g)].map((h) => h[1]).join("") : m[2];
    runs.push(Buffer.from(hex, "hex").toString("latin1"));
  }
  return runs.join(" ").replace(/\s+/g, " ");
}

/** Whitespace-insensitive "contains", so line wrapping doesn't matter. */
export const squash = (t: string) => t.replace(/\s+/g, "");
