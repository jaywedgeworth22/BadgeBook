import { getSql } from "@/lib/db";
import { bytesHaveAlpha, computeLogoScore } from "@/lib/image-flags";

export type LogoSource =
  | "simpleicons"
  | "duckduckgo"
  | "google"
  | "wikimedia"
  | "upload"
  | "preferred"
  | "companieslogo";

export type LogoKind = "icon" | "wordmark" | "unknown";

export type CachedLogo = {
  id: string;
  domain: string;
  source: LogoSource;
  brand_name: string | null;
  content_type: string;
  data_b64: string;
  byte_len: number;
  asset_kind: LogoKind;
  score: number;
  hit_count: number;
  has_alpha: boolean;
};

export const SOURCE_ORDER: LogoSource[] = [
  "preferred",
  "companieslogo",
  "simpleicons",
  "wikimedia",
  "duckduckgo",
  "google",
];

const SOURCE_KIND: Record<LogoSource, LogoKind> = {
  upload: "icon",
  preferred: "icon",
  companieslogo: "icon",
  simpleicons: "icon",
  duckduckgo: "icon",
  wikimedia: "unknown",
  google: "icon",
};

export function kindFor(source: LogoSource): LogoKind {
  return SOURCE_KIND[source];
}

export function scoreFor(
  source: LogoSource,
  contentType: string,
  hasAlpha: boolean,
): number {
  return computeLogoScore({ source, contentType, hasAlpha });
}

export async function getCachedLogo(
  domain: string,
  skip: string[],
): Promise<CachedLogo | null> {
  const sql = await getSql();
  const rows = await sql<CachedLogo>`
    select id, domain, source, brand_name, content_type, data_b64, byte_len,
           asset_kind, score, hit_count, has_alpha
    from logo_assets
    where domain = ${domain}
    order by score desc, last_hit_at desc
  `;
  const hit = rows.find((row) => !skip.includes(row.source));
  if (!hit) return null;
  await sql`
    update logo_assets
    set hit_count = hit_count + 1, last_hit_at = now()
    where id = ${hit.id}
  `;
  return hit;
}

export async function listCachedSources(domain: string): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql<{ source: string }>`
    select source from logo_assets where domain = ${domain}
  `;
  return rows.map((r) => r.source);
}

export async function listMissedSources(domain: string): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql<{ source: string }>`
    select source from logo_misses where domain = ${domain}
  `;
  return rows.map((r) => r.source);
}

export async function putCachedLogo(input: {
  domain: string;
  source: LogoSource;
  brandName?: string;
  contentType: string;
  bytes: Uint8Array;
  kind?: LogoKind;
  hasAlpha?: boolean;
}): Promise<CachedLogo> {
  const sql = await getSql();
  const id = crypto.randomUUID();
  const dataB64 = Buffer.from(input.bytes).toString("base64");
  const kind = input.kind ?? kindFor(input.source);
  const hasAlpha = input.hasAlpha ?? bytesHaveAlpha(input.bytes, input.contentType);
  const score = scoreFor(input.source, input.contentType, hasAlpha);
  const brand = input.brandName ?? null;
  await sql`
    insert into logo_assets (
      id, domain, source, brand_name, content_type, data_b64, byte_len, asset_kind, score, has_alpha
    ) values (
      ${id}, ${input.domain}, ${input.source}, ${brand}, ${input.contentType},
      ${dataB64}, ${input.bytes.byteLength}, ${kind}, ${score}, ${hasAlpha}
    )
    on conflict (domain, source) do update set
      data_b64 = excluded.data_b64,
      content_type = excluded.content_type,
      byte_len = excluded.byte_len,
      asset_kind = excluded.asset_kind,
      score = excluded.score,
      has_alpha = excluded.has_alpha,
      last_hit_at = now(),
      hit_count = logo_assets.hit_count + 1
  `;
  const rows = await sql<CachedLogo>`
    select id, domain, source, brand_name, content_type, data_b64, byte_len,
           asset_kind, score, hit_count, has_alpha
    from logo_assets
    where domain = ${input.domain} and source = ${input.source}
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    return {
      id,
      domain: input.domain,
      source: input.source,
      brand_name: brand,
      content_type: input.contentType,
      data_b64: dataB64,
      byte_len: input.bytes.byteLength,
      asset_kind: kind,
      score,
      hit_count: 1,
      has_alpha: hasAlpha,
    };
  }
  return row;
}

export async function recordMiss(domain: string, source: LogoSource): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into logo_misses (domain, source)
    values (${domain}, ${source})
    on conflict (domain, source) do update set tried_at = now()
  `;
}

export async function logoStats(): Promise<{ cached: number; domains: number }> {
  const sql = await getSql();
  const rows = await sql<{ cached: number; domains: number }>`
    select
      count(*)::int as cached,
      count(distinct domain)::int as domains
    from logo_assets
  `;
  return rows[0] ?? { cached: 0, domains: 0 };
}
