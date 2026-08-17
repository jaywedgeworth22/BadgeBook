import { normalizeCompanyKey } from "@/lib/contacts";

const UA = "CrestContactPhotos/1.0 (personal address-book logos; +https://x.ai)";
const ORIGIN = "https://companieslogo.com";
const DOMAIN_SLUGS: Record<string, string> = {
  "delta.com": "delta-air-lines",
  "united.com": "united-airlines",
  "aa.com": "american-airlines",
  "southwest.com": "southwest-airlines",
  "homedepot.com": "home-depot",
  "chase.com": "jp-morgan-chase",
  "jpmorganchase.com": "jp-morgan-chase",
  "bankofamerica.com": "bank-of-america",
  "americanexpress.com": "american-express",
  "centerpointenergy.com": "centerpoint-energy",
  "att.com": "att",
  "t-mobile.com": "t-mobile",
  "gm.com": "general-motors",
  "ge.com": "general-electric",
  "pg.com": "procter-and-gamble",
  "jnj.com": "johnson-and-johnson",
  "abc.xyz": "alphabet-google",
  "google.com": "alphabet-google",
  "meta.com": "facebook",
  "facebook.com": "facebook",
};

let slugs: string[] | null = null;
let slugsAt = 0;
const SLUG_TTL = 24 * 60 * 60 * 1000;

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xml,image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function companiesLogoSlugs(): Promise<string[]> {
  if (slugs && Date.now() - slugsAt < SLUG_TTL) return slugs;
  const xml = await fetchText(`${ORIGIN}/sitemap.xml`, 20000);
  if (!xml) return slugs ?? [];
  const found: string[] = [];
  const re = /<loc>https:\/\/companieslogo\.com\/([a-z0-9-]+)\/logo\/?<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1]) found.push(m[1]);
  }
  if (found.length > 100) {
    slugs = found;
    slugsAt = Date.now();
  }
  return slugs ?? found;
}

function tokens(value: string): string[] {
  return normalizeCompanyKey(value)
    .replace(/&/g, "and")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && t !== "the" && t !== "and");
}

function hyphenate(value: string): string {
  return tokens(value).join("-");
}

export function pickCompaniesLogoSlug(
  catalog: string[],
  opts: { domain?: string; name?: string },
): string | null {
  const domain = (opts.domain ?? "").toLowerCase();
  if (domain && DOMAIN_SLUGS[domain] && catalog.includes(DOMAIN_SLUGS[domain])) {
    return DOMAIN_SLUGS[domain];
  }

  const label = domain.split(".")[0] ?? "";
  const nameKey = opts.name ? hyphenate(opts.name) : "";
  if (nameKey && catalog.includes(nameKey)) return nameKey;
  if (label && catalog.includes(label)) return label;

  if (label) {
    const prefixed = catalog.filter((s) => s === label || s.startsWith(`${label}-`));
    if (prefixed.length === 1) return prefixed[0] ?? null;
  }

  const q = tokens(opts.name || label);
  if (!q.length) return null;

  let best: { slug: string; score: number } | null = null;
  for (const slug of catalog) {
    const st = slug.split("-");
    const hit = q.filter((t) => st.includes(t)).length;
    if (hit === 0) continue;
    let score = hit * 22;
    if (hit === q.length) score += 28;
    if (st[0] === q[0]) score += 12;
    if (q.length === 1 && st[0] === q[0]) score += 16;
    if (slug === nameKey || slug === label) score += 40;
    score -= Math.max(0, st.length - q.length) * 5;
    if (!best || score > best.score) best = { slug, score };
  }
  return best && best.score >= 50 ? best.slug : null;
}

function pickIconHref(html: string): string | null {
  const hrefs = [...html.matchAll(/\/img\/orig\/[A-Za-z0-9._-]+\.(?:svg|png)/g)].map((m) => m[0]);
  const unique = [...new Set(hrefs)].filter(
    (h) => !h.includes("/icons/") && !h.includes("account.svg") && !h.includes("calendar"),
  );
  const rank = (h: string) => {
    let s = 0;
    const lower = h.toLowerCase();
    if (lower.includes("_big")) s -= 40;
    if (/\.d[-.]/i.test(h) || lower.includes(".d-")) s -= 20;
    if (lower.endsWith(".svg")) s += 30;
    if (lower.endsWith(".png")) s += 8;
    return s;
  };
  unique.sort((a, b) => rank(b) - rank(a));
  return unique[0] ? `${ORIGIN}${unique[0]}` : null;
}

export type CompaniesLogoHit = {
  slug: string;
  href: string;
  contentType: string;
  bytes: Uint8Array;
};

export async function fetchCompaniesLogoAsset(opts: {
  domain?: string;
  name?: string;
}): Promise<CompaniesLogoHit | null> {
  const catalog = await companiesLogoSlugs();
  if (!catalog.length) return null;
  const slug = pickCompaniesLogoSlug(catalog, opts);
  if (!slug) return null;
  const html = await fetchText(`${ORIGIN}/${slug}/logo/`);
  if (!html) return null;
  const href = pickIconHref(html);
  if (!href) return null;
  try {
    const res = await fetch(href, {
      headers: { "User-Agent": UA, Accept: "image/svg+xml,image/png,image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 80 || bytes.byteLength > 1_500_000) return null;
    const type = href.endsWith(".svg")
      ? "image/svg+xml"
      : (res.headers.get("content-type") ?? "image/png").split(";")[0] ?? "image/png";
    return { slug, href, contentType: type, bytes };
  } catch {
    return null;
  }
}
