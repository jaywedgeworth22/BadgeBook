import { lookupCompanyDomain } from "./catalog.ts";

export type LogoSourceName = "preferred" | "simpleicons" | "favicon" | "upload" | "url";

export type LogoHit = {
  src: string;
  source: LogoSourceName;
  kind: "icon" | "unknown";
};

function assertNever(value: never): never {
  throw new Error(`unhandled logo value: ${String(value)}`);
}

const SIMPLE_SLUGS: Record<string, string> = {
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
  "walgreens.com": "walgreens",
  "cvs.com": "cvs",
};

const SKIP_SIMPLE = new Set(["delta.com"]);

const PREFERRED: Record<string, string> = {
  "delta.com":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 443.13 354"><polygon fill="#E31937" points="16.25,316.21 221.56,0 221.56,217.38"/><polygon fill="#E31937" points="0,354 221.56,354 221.56,260.39"/><polygon fill="#98002E" points="221.56,217.38 221.56,0 426.87,316.21"/><polygon fill="#98002E" points="221.56,260.39 221.56,354 443.13,354"/></svg>',
};

export function simpleIconsSlug(domain: string): string {
  return SIMPLE_SLUGS[domain] ?? domain.split(".")[0] ?? domain;
}

export function candidateUrls(domain: string): LogoHit[] {
  const out: LogoHit[] = [];
  const svg = PREFERRED[domain];
  if (svg) {
    out.push({
      src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      source: "preferred",
      kind: "icon",
    });
  }
  if (!SKIP_SIMPLE.has(domain)) {
    out.push({
      src: `https://cdn.simpleicons.org/${encodeURIComponent(simpleIconsSlug(domain))}`,
      source: "simpleicons",
      kind: "icon",
    });
  }
  out.push({
    src: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    source: "favicon",
    kind: "icon",
  });
  return out;
}

export function candidatesForName(name: string): LogoHit[] {
  const domain = lookupCompanyDomain(name);
  return domain ? candidateUrls(domain) : [];
}

export function sourceLabel(source: LogoSourceName): string {
  switch (source) {
    case "preferred":
      return "Iconic mark";
    case "simpleicons":
      return "Simple Icons";
    case "favicon":
      return "Favicon";
    case "upload":
      return "Your file";
    case "url":
      return "Pasted URL";
    default:
      return assertNever(source);
  }
}

export function viaLabel(via?: string): string {
  switch (via) {
    case "phone":
      return "found by phone";
    case "catalog":
      return "known company";
    case "website":
      return "from website";
    case "email":
      return "from email";
    case "guess":
      return "guessed from name";
    case undefined:
    case "":
      return "";
    default:
      return via;
  }
}

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

export async function composeFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    throw new Error("Choose an image file");
  }
  if (file.size > 3_000_000) throw new Error("Keep uploads under 3 MB");
  return readAsDataUrl(file);
}

export async function composeFromUrl(raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) throw new Error("Paste an http(s) image URL");
  const res = await fetch(trimmed, { mode: "cors" });
  if (!res.ok) throw new Error("Could not fetch that image");
  const blob = await res.blob();
  if (!blob.type.startsWith("image/") && blob.type !== "image/svg+xml") {
    throw new Error("That URL is not an image");
  }
  if (blob.size > 3_000_000) throw new Error("Keep images under 3 MB");
  return readAsDataUrl(blob);
}

/** Embed a remote logo as a data URL so the downloaded vCard is self-contained. */
export async function embedSrc(src: string): Promise<string> {
  if (src.startsWith("data:image/")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return src;
    const blob = await res.blob();
    if (blob.size < 40 || blob.size > 1_500_000) return src;
    return await readAsDataUrl(blob);
  } catch {
    return src;
  }
}
