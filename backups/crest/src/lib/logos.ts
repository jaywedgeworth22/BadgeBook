export type LogoSourceName =
  | "simpleicons"
  | "duckduckgo"
  | "google"
  | "wikimedia"
  | "upload"
  | "preferred"
  | "companieslogo";

export type LogoKind = "icon" | "wordmark" | "unknown";

export type LogoResult = {
  dataUrl: string;
  source: LogoSourceName | string;
  kind: LogoKind | string;
  cached: boolean;
  hasAlpha?: boolean;
};

export function logoProxyUrl(domain: string, skip: string[] = [], name?: string): string {
  const params = new URLSearchParams({ domain });
  if (skip.length) params.set("skip", skip.join(","));
  if (name) params.set("name", name);
  return `/api/logo?${params.toString()}`;
}

export function sourceLabel(source: string): string {
  switch (source) {
    case "simpleicons":
      return "Simple Icons";
    case "duckduckgo":
      return "Favicon";
    case "google":
      return "Google";
    case "wikimedia":
      return "Wikipedia";
    case "companieslogo":
      return "CompaniesLogo";
    case "preferred":
      return "Iconic mark";
    case "upload":
      return "Your file";
    case "name":
      return "Company name";
    case "phone":
      return "Phone number";
    case "catalog":
      return "Known company";
    case "guess":
      return "Name guess";
    default:
      return source || "Library";
  }
}

export function viaLabel(via?: string): string {
  switch (via) {
    case "phone":
      return "found by phone";
    case "name":
      return "found by name";
    case "catalog":
      return "known company";
    case "website":
      return "from website";
    case "email":
      return "from email";
    case "guess":
      return "guessed from name";
    default:
      return "";
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read logo"));
    reader.readAsDataURL(blob);
  });
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo failed to load"));
    img.src = src;
  });
}

export async function fetchLogo(
  domain: string,
  skip: string[] = [],
  name?: string,
): Promise<LogoResult> {
  const res = await fetch(logoProxyUrl(domain, skip, name));
  if (!res.ok) throw new Error("Logo not found");
  const blob = await res.blob();
  if (blob.size < 40) throw new Error("Logo too small");
  return {
    dataUrl: await readAsDataUrl(blob),
    source: res.headers.get("X-Crest-Source") ?? "unknown",
    kind: res.headers.get("X-Crest-Kind") ?? "unknown",
    cached: res.headers.get("X-Crest-Cached") === "1",
    hasAlpha: res.headers.get("X-Crest-Alpha") === "1",
  };
}

function canvasHasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 250) return true;
  }
  return false;
}

function trimTransparent(img: HTMLImageElement): {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  hasAlpha: boolean;
} {
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const probe = document.createElement("canvas");
  probe.width = iw;
  probe.height = ih;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { sx: 0, sy: 0, sw: iw, sh: ih, hasAlpha: false };
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, iw, ih);
  let minX = iw;
  let minY = ih;
  let maxX = 0;
  let maxY = 0;
  let alphaHits = 0;
  for (let y = 0; y < ih; y += 1) {
    for (let x = 0; x < iw; x += 1) {
      const a = data[(y * iw + x) * 4 + 3] ?? 255;
      if (a < 250) alphaHits += 1;
      if (a < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const hasAlpha = alphaHits > iw * ih * 0.02;
  if (maxX <= minX || maxY <= minY) {
    return { sx: 0, sy: 0, sw: iw, sh: ih, hasAlpha };
  }
  return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1, hasAlpha };
}

function composeOnCanvas(img: HTMLImageElement, kind: string, preferAlpha = false): string {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const trimmed = trimTransparent(img);
  const hasAlpha = trimmed.hasAlpha || preferAlpha;

  ctx.fillStyle = "#f7f3ec";
  ctx.fillRect(0, 0, size, size);

  const ratio = trimmed.sw / trimmed.sh;
  const squareish = ratio >= 0.8 && ratio <= 1.25;
  const padRatio = kind === "icon" || squareish ? 0.2 : 0.14;
  const pad = Math.round(size * padRatio);
  const box = size - pad * 2;
  const scale = Math.min(box / trimmed.sw, box / trimmed.sh);
  const dw = Math.max(1, trimmed.sw * scale);
  const dh = Math.max(1, trimmed.sh * scale);
  ctx.drawImage(
    img,
    trimmed.sx,
    trimmed.sy,
    trimmed.sw,
    trimmed.sh,
    (size - dw) / 2,
    (size - dh) / 2,
    dw,
    dh,
  );

  try {
    return hasAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return "";
  }
}

/**
 * Square contact photo. Transparent iconic marks are preferred: we trim
 * empty padding and keep PNG so edges stay crisp on an iPhone contact card.
 */
export async function composeContactPhoto(
  domain: string,
  skip: string[] = [],
  name?: string,
): Promise<LogoResult> {
  const fetched = await fetchLogo(domain, skip, name);
  const img = await loadImageFromUrl(fetched.dataUrl);
  const composed = composeOnCanvas(img, fetched.kind, fetched.hasAlpha);
  return { ...fetched, dataUrl: composed || fetched.dataUrl };
}

export type ComposedFile = {
  preview: string;
  original: File;
  hasAlpha: boolean;
};

export async function composeFromFile(file: File): Promise<ComposedFile> {
  if (!file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    throw new Error("Choose an image file");
  }
  if (file.size > 3_000_000) throw new Error("Keep uploads under 3 MB");
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImageFromUrl(dataUrl);
  const preferAlpha =
    file.type.includes("png") || file.type.includes("svg") || file.type.includes("webp");
  const preview = composeOnCanvas(img, "icon", preferAlpha) || dataUrl;
  const probe = document.createElement("canvas");
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  probe.width = Math.min(iw, 64);
  probe.height = Math.min(ih, 64);
  const pctx = probe.getContext("2d");
  let hasAlpha = preferAlpha;
  if (pctx) {
    pctx.drawImage(img, 0, 0, probe.width, probe.height);
    hasAlpha = canvasHasAlpha(pctx, probe.width, probe.height) || preferAlpha;
  }
  return { preview, original: file, hasAlpha };
}

export async function uploadLogoToLibrary(domain: string, file: File): Promise<LogoResult> {
  const form = new FormData();
  form.set("domain", domain);
  form.set("file", file);
  const res = await fetch("/api/logo", { method: "POST", body: form });
  if (!res.ok) throw new Error("Could not save that file");
  const blob = await res.blob();
  return {
    dataUrl: await readAsDataUrl(blob),
    source: res.headers.get("X-Crest-Source") ?? "upload",
    kind: res.headers.get("X-Crest-Kind") ?? "icon",
    cached: true,
    hasAlpha: res.headers.get("X-Crest-Alpha") === "1",
  };
}

export async function fetchLogoStats(): Promise<{ cached: number; domains: number }> {
  const res = await fetch("/api/logo?stats=1");
  if (!res.ok) return { cached: 0, domains: 0 };
  return (await res.json()) as { cached: number; domains: number };
}

export function dataUrlToFile(dataUrl: string, name: string): File {
  const [head, body] = dataUrl.split(",");
  const mime = head?.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(body ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}
