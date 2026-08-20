import { getSql } from "@/lib/db";
import { normalizeCompanyKey } from "@/lib/contacts";
import { lookupPhoneDomain, phoneVariants } from "@/lib/phones";

const UA = "CrestContactPhotos/1.0 (personal address-book logos; +https://x.ai)";

export type IdentityHit = {
  domain: string;
  source: "name" | "phone" | "catalog";
  label?: string;
};

type CachedRow = {
  cache_key: string;
  domain: string | null;
  source: string;
  label: string | null;
};

function hostFromUrl(raw: string): string | null {
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    const host = new URL(withProto).hostname.replace(/^www\./, "").toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null;
    if (host.includes("..")) return null;
    if (
      /wikipedia\.|wikidata\.|wikimedia\.|google\.|facebook\.|linkedin\.|crunchbase\.|bloomberg\.|forbes\.|youtube\./.test(
        host,
      )
    ) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, timeoutMs = 4500): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function readCache(key: string): Promise<IdentityHit | "miss" | null> {
  try {
    const sql = await getSql();
    const rows = await sql<CachedRow>`
      select cache_key, domain, source, label from identity_resolves
      where cache_key = ${key} limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    if (!row.domain) return "miss";
    const source = row.source === "phone" || row.source === "catalog" ? row.source : "name";
    return { domain: row.domain, source, label: row.label ?? undefined };
  } catch {
    return null;
  }
}

async function writeCache(key: string, hit: IdentityHit | null): Promise<void> {
  try {
    const sql = await getSql();
    await sql`
      insert into identity_resolves (cache_key, domain, source, label)
      values (${key}, ${hit?.domain ?? null}, ${hit?.source ?? "name"}, ${hit?.label ?? null})
      on conflict (cache_key) do update set
        domain = excluded.domain,
        source = excluded.source,
        label = excluded.label
    `;
  } catch {
    /* first boot */
  }
}

type SuggestRow = { name?: string; domain?: string };

function pickSuggest(query: string, rows: SuggestRow[]): IdentityHit | null {
  const q = normalizeCompanyKey(query);
  if (q.length < 2) return null;
  const scored: { s: number; domain: string; name?: string }[] = [];
  for (const row of rows) {
    const domain = hostFromUrl(row.domain ?? "");
    if (!domain) continue;
    const n = normalizeCompanyKey(row.name ?? "");
    let s = 0;
    if (n === q) s += 50;
    else if (n.startsWith(q) || q.startsWith(n)) s += 32;
    else if (n.includes(q) || q.includes(n)) s += 18;
    if (domain.split(".")[0] === q.replace(/\s+/g, "")) s += 20;
    if (domain.endsWith(".com") || domain.endsWith(".gov")) s += 6;
    if (s >= 18) scored.push({ s, domain, name: row.name });
  }
  scored.sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (!best) return null;
  return { domain: best.domain, source: "name", label: best.name };
}

async function searchClearbit(query: string): Promise<IdentityHit | null> {
  const data = await fetchJson(
    `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`,
  );
  if (!Array.isArray(data)) return null;
  return pickSuggest(query, data as SuggestRow[]);
}

async function officialSiteFromQid(qid: string): Promise<string | null> {
  const data = (await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(qid)}&props=claims&format=json`,
  )) as { entities?: Record<string, { claims?: { P856?: Array<{ mainsnak?: { datavalue?: { value?: string } } }> } }> } | null;
  const claims = data?.entities?.[qid]?.claims?.P856;
  const url = claims?.[0]?.mainsnak?.datavalue?.value;
  return url ? hostFromUrl(url) : null;
}

async function searchWikidataName(query: string): Promise<IdentityHit | null> {
  const data = (await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&limit=5&format=json`,
  )) as { search?: Array<{ id?: string; label?: string; description?: string }> } | null;
  const hits = data?.search ?? [];
  for (const hit of hits) {
    if (!hit.id) continue;
    const desc = (hit.description ?? "").toLowerCase();
    if (desc.includes("human") || desc.includes("person") || desc.includes("researcher")) continue;
    const domain = await officialSiteFromQid(hit.id);
    if (domain) return { domain, source: "name", label: hit.label };
  }
  return null;
}

async function searchWikipediaPhone(phone: string): Promise<IdentityHit | null> {
  for (const variant of phoneVariants(phone).slice(0, 4)) {
    const data = (await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${variant}"`)}&srlimit=3&format=json`,
    )) as { query?: { search?: Array<{ title?: string }> } } | null;
    const titles = (data?.query?.search ?? []).map((s) => s.title).filter(Boolean) as string[];
    if (!titles.length) continue;
    const props = (await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${titles.map(encodeURIComponent).join("|")}&format=json`,
    )) as { query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string }; title?: string }> } } | null;
    for (const page of Object.values(props?.query?.pages ?? {})) {
      const qid = page.pageprops?.wikibase_item;
      if (!qid) continue;
      const domain = await officialSiteFromQid(qid);
      if (domain) return { domain, source: "phone", label: page.title };
    }
  }
  return null;
}

async function searchWikidataPhone(phone: string): Promise<IdentityHit | null> {
  const variants = phoneVariants(phone).slice(0, 3);
  const filters = variants
    .map((v) => `contains(replace(replace(replace(str(?phone), " ", ""), "-", ""), "+", ""), "${v.replace(/\D/g, "")}")`)
    .join(" || ");
  const query = `SELECT ?item ?itemLabel ?website WHERE {
    ?item wdt:P1329 ?phone .
    FILTER(${filters})
    OPTIONAL { ?item wdt:P856 ?website }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 5`;
  const data = (await fetchJson(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
    6000,
  )) as { results?: { bindings?: Array<{ website?: { value?: string }; itemLabel?: { value?: string } }> } } | null;
  for (const row of data?.results?.bindings ?? []) {
    const domain = row.website?.value ? hostFromUrl(row.website.value) : null;
    if (domain) return { domain, source: "phone", label: row.itemLabel?.value };
  }
  return null;
}

export async function resolveByName(name: string): Promise<IdentityHit | null> {
  const cleaned = name.trim();
  if (cleaned.length < 2) return null;
  const key = `name:${normalizeCompanyKey(cleaned)}`;
  const cached = await readCache(key);
  if (cached === "miss") return null;
  if (cached) return cached;

  const hit = (await searchClearbit(cleaned)) ?? (await searchWikidataName(cleaned));
  await writeCache(key, hit);
  return hit;
}

export async function resolveByPhone(phone: string): Promise<IdentityHit | null> {
  const catalog = lookupPhoneDomain(phone);
  if (catalog) return { domain: catalog, source: "catalog" };

  const variants = phoneVariants(phone);
  const primary = variants[0];
  if (!primary) return null;
  const key = `phone:${primary}`;
  const cached = await readCache(key);
  if (cached === "miss") return null;
  if (cached) return cached;

  const hit = (await searchWikidataPhone(phone)) ?? (await searchWikipediaPhone(phone));
  await writeCache(key, hit);
  return hit;
}
