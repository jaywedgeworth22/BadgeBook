import { createFileRoute } from "@tanstack/react-router";
import { bytesHaveAlpha } from "@/lib/image-flags";
import {
  getCachedLogo,
  kindFor,
  listCachedSources,
  listMissedSources,
  logoStats,
  putCachedLogo,
  recordMiss,
  SOURCE_ORDER,
  type LogoSource,
} from "@/lib/logo-cache.server";
import { preferredFor } from "@/lib/preferred-marks";
import { fetchCompaniesLogoAsset } from "@/lib/companieslogo";

export const Route = createFileRoute("/api/logo")({
  server: {
    handlers: {
      GET: handleGet,
      HEAD: handleGet,
      POST: handlePost,
    },
  },
});

const UA = "CrestContactPhotos/1.0 (personal address-book logos; +https://x.ai)";

/** Simple Icons slugs when the registrable name is not the brand slug. */
const SLUGS: Record<string, string> = {
  "apple.com": "apple",
  "google.com": "google",
  "microsoft.com": "microsoft",
  "amazon.com": "amazon",
  "meta.com": "meta",
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "tesla.com": "tesla",
  "nvidia.com": "nvidia",
  "netflix.com": "netflix",
  "spotify.com": "spotify",
  "adobe.com": "adobe",
  "salesforce.com": "salesforce",
  "oracle.com": "oracle",
  "ibm.com": "ibm",
  "intel.com": "intel",
  "cisco.com": "cisco",
  "stripe.com": "stripe",
  "paypal.com": "paypal",
  "visa.com": "visa",
  "mastercard.com": "mastercard",
  "americanexpress.com": "americanexpress",
  "chase.com": "jpmorgan",
  "jpmorganchase.com": "jpmorgan",
  "bankofamerica.com": "bankofamerica",
  "wellsfargo.com": "wellsfargo",
  "citi.com": "citigroup",
  "geico.com": "geico",
  "statefarm.com": "statefarm",
  "verizon.com": "verizon",
  "att.com": "atandt",
  "t-mobile.com": "tmobile",
  "united.com": "unitedairlines",
  "aa.com": "americanairlines",
  "southwest.com": "southwestairlines",
  "fedex.com": "fedex",
  "ups.com": "ups",
  "usps.com": "usps",
  "homedepot.com": "homedepot",
  "lowes.com": "lowe's",
  "costco.com": "costco",
  "walmart.com": "walmart",
  "target.com": "target",
  "starbucks.com": "starbucks",
  "mcdonalds.com": "mcdonalds",
  "uber.com": "uber",
  "lyft.com": "lyft",
  "doordash.com": "doordash",
  "airbnb.com": "airbnb",
  "nike.com": "nike",
  "samsung.com": "samsung",
  "sony.com": "sony",
  "ford.com": "ford",
  "bmw.com": "bmw",
  "usaa.com": "usaa",
  "centerpointenergy.com": "centerpointenergy",
  "x.ai": "x",
  "squareup.com": "square",
};

/** SI slugs that are a different brand (e.g. Delta the software company). */
const SKIP_SIMPLEICONS = new Set(["delta.com"]);

function slugFor(domain: string): string {
  if (SLUGS[domain]) return SLUGS[domain];
  return domain.split(".")[0] ?? domain;
}

function safeDomain(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned =
    raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] ?? "";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) return null;
  if (cleaned.includes("..")) return null;
  return cleaned;
}

function parseSkip(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function bytesFromB64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function logoResponse(
  request: Request,
  body: Uint8Array,
  contentType: string,
  meta: { source: string; kind: string; cached: boolean; hasAlpha?: boolean },
): Response {
  const hasAlpha = meta.hasAlpha ?? bytesHaveAlpha(body, contentType);
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=604800",
    "Access-Control-Allow-Origin": "*",
    "X-Crest-Source": meta.source,
    "X-Crest-Kind": meta.kind,
    "X-Crest-Cached": meta.cached ? "1" : "0",
    "X-Crest-Alpha": hasAlpha ? "1" : "0",
  });
  return new Response(request.method === "HEAD" ? null : Buffer.from(body), {
    status: 200,
    headers,
  });
}

async function seedPreferred(domain: string, skip: string[]): Promise<void> {
  if (skip.includes("preferred")) return;
  if (!preferredFor(domain)) return;
  let already: string[] = [];
  try {
    already = await listCachedSources(domain);
  } catch {
    already = [];
  }
  if (already.includes("preferred")) return;
  const fetched = await fetchPreferred(domain);
  if (!fetched) return;
  try {
    await putCachedLogo({
      domain,
      source: "preferred",
      brandName: slugFor(domain),
      contentType: fetched.contentType,
      bytes: fetched.bytes,
      kind: "icon",
      hasAlpha: true,
    });
  } catch {
    /* ignore */
  }
}

async function seedCompaniesLogo(domain: string, name: string | undefined, skip: string[]): Promise<void> {
  if (skip.includes("companieslogo")) return;
  let already: string[] = [];
  let missed: string[] = [];
  try {
    already = await listCachedSources(domain);
    missed = await listMissedSources(domain);
  } catch {
    already = [];
    missed = [];
  }
  if (already.includes("companieslogo") || missed.includes("companieslogo")) return;
  const fetched = await fetchCompaniesLogoAsset({ domain, name });
  if (!fetched) {
    try {
      await recordMiss(domain, "companieslogo");
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await putCachedLogo({
      domain,
      source: "companieslogo",
      brandName: fetched.slug,
      contentType: fetched.contentType,
      bytes: fetched.bytes,
      kind: "icon",
    });
  } catch {
    /* ignore */
  }
}

async function handleGet({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("stats") === "1") {
    const stats = await logoStats();
    return Response.json(stats);
  }

  const domain = safeDomain(url.searchParams.get("domain"));
  if (!domain) return new Response("Invalid domain", { status: 400 });

  const skip = parseSkip(url.searchParams.get("skip"));
  const name = (url.searchParams.get("name") ?? "").trim() || undefined;

  try {
    await seedPreferred(domain, skip);
  } catch {
    /* continue */
  }

  try {
    await seedCompaniesLogo(domain, name, skip);
  } catch {
    /* continue */
  }

  try {
    const cached = await getCachedLogo(domain, skip);
    if (cached) {
      return logoResponse(request, bytesFromB64(cached.data_b64), cached.content_type, {
        source: cached.source,
        kind: cached.asset_kind,
        cached: true,
        hasAlpha: cached.has_alpha,
      });
    }
  } catch {
    /* cache miss / first boot */
  }

  let already: string[] = [];
  let missed: string[] = [];
  try {
    already = await listCachedSources(domain);
    missed = await listMissedSources(domain);
  } catch {
    already = [];
    missed = [];
  }

  for (const source of SOURCE_ORDER) {
    if (skip.includes(source)) continue;
    if (already.includes(source)) continue;
    if (missed.includes(source)) continue;
    if (source === "simpleicons" && SKIP_SIMPLEICONS.has(domain)) continue;

    const fetched = await fetchFromSource(domain, source, name);
    if (!fetched) {
      try {
        await recordMiss(domain, source);
      } catch {
        /* ignore */
      }
      continue;
    }

    try {
      await putCachedLogo({
        domain,
        source,
        brandName: slugFor(domain),
        contentType: fetched.contentType,
        bytes: fetched.bytes,
        kind: kindFor(source),
      });
    } catch {
      /* still return the bytes even if cache write fails */
    }

    return logoResponse(request, fetched.bytes, fetched.contentType, {
      source,
      kind: kindFor(source),
      cached: false,
    });
  }

  return new Response("Logo not found", { status: 404 });
}

async function handlePost({ request }: { request: Request }): Promise<Response> {
  const form = await request.formData();
  const domain = safeDomain(typeof form.get("domain") === "string" ? String(form.get("domain")) : null);
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response("Missing file", { status: 400 });
  }
  if (file.size < 40 || file.size > 3_000_000) {
    return new Response("File too small or too large", { status: 400 });
  }
  const type = (file.type || "image/png").split(";")[0] ?? "image/png";
  if (!type.startsWith("image/")) {
    return new Response("Not an image", { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = domain ?? `upload-${crypto.randomUUID().slice(0, 8)}.local`;
  try {
    const saved = await putCachedLogo({
      domain: key,
      source: "upload",
      brandName: domain ?? "upload",
      contentType: type,
      bytes,
      kind: "icon",
    });
    return logoResponse(request, bytes, type, {
      source: saved.source,
      kind: saved.asset_kind,
      cached: true,
      hasAlpha: saved.has_alpha,
    });
  } catch {
    return logoResponse(request, bytes, type, {
      source: "upload",
      kind: "icon",
      cached: false,
    });
  }
}

type Fetched = { bytes: Uint8Array; contentType: string };

async function fetchPreferred(domain: string): Promise<Fetched | null> {
  const mark = preferredFor(domain);
  if (!mark) return null;
  if (mark.svg) {
    return { bytes: new TextEncoder().encode(mark.svg), contentType: "image/svg+xml" };
  }
  if (mark.href) return fetchUrl(mark.href, "image/svg+xml");
  return null;
}

async function fetchFromSource(
  domain: string,
  source: LogoSource,
  name?: string,
): Promise<Fetched | null> {
  if (source === "upload") return null;
  if (source === "preferred") return fetchPreferred(domain);
  if (source === "companieslogo") {
    const hit = await fetchCompaniesLogoAsset({ domain, name });
    if (!hit) return null;
    return { bytes: hit.bytes, contentType: hit.contentType };
  }
  if (source === "simpleicons") return fetchUrl(simpleIconsUrl(domain), "image/svg+xml");
  if (source === "duckduckgo") {
    return fetchUrl(`https://icons.duckduckgo.com/ip3/${domain}.ico`, "image/x-icon");
  }
  if (source === "google") {
    return fetchUrl(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
      "image/png",
    );
  }
  if (source === "wikimedia") return fetchWikimedia(domain);
  return null;
}

function simpleIconsUrl(domain: string): string {
  return `https://cdn.simpleicons.org/${encodeURIComponent(slugFor(domain))}`;
}

async function fetchUrl(src: string, fallbackType: string): Promise<Fetched | null> {
  try {
    const res = await fetch(src, {
      headers: { "User-Agent": UA, Accept: "image/*,image/svg+xml,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0] ?? "";
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 60 || buf.byteLength > 1_500_000) return null;
    if (looksLikeHtml(buf)) return null;
    const contentType =
      type.startsWith("image/") || type === "image/svg+xml"
        ? type
        : src.includes("simpleicons") || src.endsWith(".svg")
          ? "image/svg+xml"
          : fallbackType;
    return { bytes: buf, contentType };
  } catch {
    return null;
  }
}

function looksLikeHtml(buf: Uint8Array): boolean {
  const head = new TextDecoder().decode(buf.slice(0, 80)).trim().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}

const SKIP_TITLE = /boeing|airbus|aircraft|airport|n\d{3}|flight|photo of|ground track/i;

async function fetchWikimedia(domain: string): Promise<Fetched | null> {
  const brand = slugFor(domain).replace(/-/g, " ");
  try {
    const api = new URL("https://commons.wikimedia.org/w/api.php");
    api.searchParams.set("action", "query");
    api.searchParams.set("generator", "search");
    api.searchParams.set("gsrsearch", `${brand} logo svg`);
    api.searchParams.set("gsrnamespace", "6");
    api.searchParams.set("gsrlimit", "8");
    api.searchParams.set("prop", "imageinfo");
    api.searchParams.set("iiprop", "url|mime|size");
    api.searchParams.set("format", "json");
    const res = await fetch(api, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { title?: string; imageinfo?: Array<{ url?: string; mime?: string; size?: number }> }
        >;
      };
    };
    const pages = Object.values(data.query?.pages ?? {});
    pages.sort((a, b) => {
      const am = a.imageinfo?.[0]?.mime ?? "";
      const bm = b.imageinfo?.[0]?.mime ?? "";
      return Number(bm.includes("svg")) - Number(am.includes("svg"));
    });
    for (const page of pages) {
      const title = page.title ?? "";
      if (SKIP_TITLE.test(title)) continue;
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      const fetched = await fetchUrl(info.url, info.mime ?? "image/png");
      if (fetched) return fetched;
    }
    return null;
  } catch {
    return null;
  }
}
