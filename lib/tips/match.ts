/**
 * D3b × D2 (accounts track): which of a tip's materials the household already has, from the names of
 * inventory items marked have or bought. Simple word matching on the material's main word.
 */
const STOP = new Set(["a", "an", "the", "or", "and", "if", "you", "have", "it", "of", "used", "with", "your", "clean", "spare", "extra"]);

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(es|s)$/, ""));

export function matchMaterials(materials: string[], ownedNames: string[]): string[] {
  const have = new Set(ownedNames.flatMap(words));
  return materials.filter((m) => words(m).some((w) => have.has(w)));
}
