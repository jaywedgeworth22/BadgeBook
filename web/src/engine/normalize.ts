/** BadgeBook MATCHING-ENGINE §2 + Crest legal-suffix / bracket stripping. */

const LEGAL_STRIP =
  /\s*,?\s*(inc\.?|incorporated|llc|l\.l\.c\.?|ltd\.?|limited|corp\.?|corporation|co\.?|company|gmbh|ag|plc|holdings|group|llc\.|p\.c\.|llp)\s*$/i;

export function cleanName(raw: string): string {
  return raw
    .replace(/\s*[([{][^)\]}]*[)\]}]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[ \-–—,]+|[ \-–—,]+$/g, "")
    .trim();
}

export function companyKey(name: string): string {
  return cleanName(name)
    .replace(LEGAL_STRIP, "")
    .replace(/[.,'"’]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function brandTail(raw: string): string | undefined {
  const dash = raw.match(/\s+[-–—]\s+/);
  const at = raw.match(/\s+[Aa]t\s+/);
  let head: string;
  let tail: string;
  if (dash && dash.index !== undefined) {
    head = raw.slice(0, dash.index).trim();
    tail = raw.slice(dash.index + dash[0].length).trim();
    if (tail.includes(" - ")) return undefined;
  } else if (at && at.index !== undefined) {
    head = raw.slice(0, at.index).trim();
    tail = raw.slice(at.index + at[0].length).trim();
  } else {
    return undefined;
  }
  const headWords = head.split(/\s+/).filter(Boolean).length;
  const tailWords = tail.split(/\s+/).filter(Boolean).length;
  if (headWords < 1 || headWords > 4 || tailWords > 5) return undefined;
  return tail;
}

export function passesSimilarity(query: string, brandName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const q = norm(query);
  const b = norm(brandName);
  if (q && b && (q.includes(b) || b.includes(q))) return true;
  const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const qw = words(query);
  const bw = words(brandName);
  for (const w of qw) if (bw.has(w)) return true;
  return false;
}
