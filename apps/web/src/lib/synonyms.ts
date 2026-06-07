/**
 * Liten svensk byggterm-ordlista för noggrannare matchning (pris + tidsnorm).
 * Varje grupp = synonymer/relaterade ord; matchning sker på kanoniska termer.
 * Utöka fritt – detta är ett enkelt, redigerbart lexikon (inga externa data).
 */
const SYNONYM_GROUPS: string[][] = [
  ["gips", "gipsskiva", "gipsplatta", "våtrumsgips"],
  ["regel", "träregel", "stomme", "stålregel", "reglar"],
  ["vägg", "innervägg", "mellanvägg", "väggyta"],
  ["golv", "bjälklag", "golvbjälklag", "golvskiva"],
  ["plywood", "board", "ply", "björkplywood"],
  ["skiva", "skivor", "osb"],
  ["dörr", "svängdörr", "innerdörr", "dörrar"],
  ["fönster"],
  ["isolering", "mineralull", "stenull", "glasull"],
  ["linoleum", "möbellinoleum"],
  ["kabel", "installationskabel", "ekk"],
  ["uttag", "vägguttag", "eluttag"],
  ["strömbrytare", "brytare", "strömställare"],
  ["rör", "avloppsrör", "pex", "pp"],
  ["undertak", "innertak", "akustiktak", "undertaksplattor"],
  ["hylla", "hyllor", "bokhylla", "hyllplan"],
  ["skåp", "skåpstomme", "luckor"],
  ["portal"],
  ["pelare", "kolumn"],
  ["balk"],
  ["tak", "yttertak"],
  ["armering", "armeringsnät", "nät"],
  ["betong", "gjutning"],
  ["murbruk", "mur", "murning"],
  ["ytbehandling", "lack", "lackning", "målning"],
];

const CANON = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  const canon = group[0];
  for (const word of group) CANON.set(word, canon);
}

function rawTokens(text: string): string[] {
  return (text ?? "")
    .toLowerCase()
    .split(/[\s,/()\-.]+/)
    .filter((t) => t.length >= 3);
}

/** Tokens + kanoniska synonymformer (t.ex. "gipsskiva" → även "gips"). */
export function canonicalTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const t of rawTokens(text)) {
    out.add(t);
    const c = CANON.get(t);
    if (c) out.add(c);
  }
  return out;
}

/** Antal gemensamma (kanoniska) termer mellan två texter. */
export function termOverlap(a: string, b: string): number {
  const sa = canonicalTokens(a);
  const sb = canonicalTokens(b);
  let n = 0;
  for (const t of sa) if (sb.has(t)) n++;
  return n;
}
