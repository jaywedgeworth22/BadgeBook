import { createContact, type Contact } from "@/lib/contacts";

export type VcardImportProgress = {
  bytesRead: number;
  totalBytes: number;
  found: number;
  skippedPhotos: number;
};

export type VcardImportResult = {
  contacts: Contact[];
  skippedPhotos: number;
  includePhotos: boolean;
  encoding: string;
};

const PHOTO_SKIP_BYTES = 8 * 1024 * 1024;

function looksLikePhotoName(name: string): boolean {
  return name === "PHOTO" || name.endsWith(".PHOTO");
}

function isFold(line: string): boolean {
  return line.startsWith(" ") || line.startsWith("\t");
}

function isBareBase64(line: string): boolean {
  if (line.includes(":")) return false;
  const t = line.trim();
  return t.length >= 60 && /^[A-Za-z0-9+/=]+$/.test(t);
}

function propertyName(left: string): string {
  return (left.split(";")[0] ?? "").replace(/^item\d+\./i, "").toUpperCase();
}

async function detectEncoding(file: File): Promise<string> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (head.length >= 2 && head[0] === 0xff && head[1] === 0xfe) return "utf-16le";
  if (head.length >= 2 && head[0] === 0xfe && head[1] === 0xff) return "utf-16be";
  if (head.length >= 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) return "utf-8";
  if (head.length >= 4 && head[1] === 0 && head[3] === 0 && head[0] !== 0) return "utf-16le";
  return "utf-8";
}

function unescapeVcard(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parsePhoto(params: string, value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:image/")) return trimmed;
  const typeMatch = /TYPE=([A-Za-z0-9+-]+)/i.exec(params);
  const rawType = (typeMatch?.[1] ?? "jpeg").toLowerCase();
  const mime =
    rawType === "jpg" || rawType === "jpeg"
      ? "jpeg"
      : rawType === "png"
        ? "png"
        : rawType === "webp"
          ? "webp"
          : rawType.includes("svg")
            ? "svg+xml"
            : "jpeg";
  const data = trimmed.replace(/\s+/g, "");
  if (data.length < 40 || data.length > 400_000) return undefined;
  return `data:image/${mime};base64,${data}`;
}

type Draft = {
  name?: string;
  givenName?: string;
  familyName?: string;
  organization?: string;
  email?: string;
  phone?: string;
  website?: string;
  photo?: string;
  hadExistingPhoto?: boolean;
  showAsCompany?: boolean;
};

function flushDraft(draft: Draft | null, into: Contact[]) {
  if (!draft) return;
  const assembled = [draft.givenName, draft.familyName].filter(Boolean).join(" ").trim();
  const name = draft.name?.trim() || draft.organization?.trim() || assembled;
  if (!name) return;
  into.push(
    createContact({
      name,
      givenName: draft.givenName,
      familyName: draft.familyName,
      organization: draft.organization,
      email: draft.email,
      phone: draft.phone,
      website: draft.website,
      photoDataUrl: draft.photo,
      hadExistingPhoto: Boolean(draft.hadExistingPhoto || draft.photo),
      crestApplied: false,
      kind: draft.showAsCompany ? "company" : "auto",
      source: "import",
    }),
  );
}

/**
 * Stream a contact card of any size (iPhone full-book exports are often 40–80 MB).
 * Existing photos are skipped on large files so the book fits in the browser.
 */
export async function importVcardFile(
  file: File,
  opts: {
    includePhotos?: boolean;
    onProgress?: (p: VcardImportProgress) => void;
  } = {},
): Promise<VcardImportResult> {
  if (file.size > 200 * 1024 * 1024) {
    throw new Error("This card is over 200 MB. Export a smaller set from Contacts and try again.");
  }

  const includePhotos = opts.includePhotos ?? file.size < PHOTO_SKIP_BYTES;
  const encoding = await detectEncoding(file);
  const decoder = new TextDecoder(encoding);
  const reader = file.stream().getReader();

  const contacts: Contact[] = [];
  let skippedPhotos = 0;
  let bytesRead = 0;
  let carry = "";
  let draft: Draft | null = null;
  let skippingPhoto = false;
  let photoLeft = "";
  let photoValue = "";
  let lastTick = 0;

  const emit = () => {
    opts.onProgress?.({
      bytesRead: Math.min(bytesRead, file.size),
      totalBytes: file.size,
      found: contacts.length,
      skippedPhotos,
    });
  };

  const applyLogicalLine = (raw: string) => {
    const line = raw.replace(/^\uFEFF/, "");
    if (!line) return;

    if (skippingPhoto) {
      if (isFold(line) || isBareBase64(line)) return;
      skippingPhoto = false;
    }

    const upper = line.toUpperCase();
    if (upper === "BEGIN:VCARD") {
      draft = {};
      photoLeft = "";
      photoValue = "";
      return;
    }
    if (upper === "END:VCARD") {
      if (includePhotos && photoValue && draft) {
        draft.photo = parsePhoto(photoLeft, photoValue);
      }
      flushDraft(draft, contacts);
      draft = null;
      photoLeft = "";
      photoValue = "";
      return;
    }
    if (!draft) return;

    const colon = line.indexOf(":");
    if (colon < 0) {
      if (includePhotos && photoLeft && isBareBase64(line)) photoValue += line.trim();
      return;
    }
    const left = line.slice(0, colon);
    const value = unescapeVcard(line.slice(colon + 1));
    const name = propertyName(left);

    if (looksLikePhotoName(name)) {
      draft.hadExistingPhoto = true;
      if (!includePhotos) {
        skippingPhoto = true;
        skippedPhotos += 1;
        return;
      }
      photoLeft = left;
      photoValue = value;
      return;
    }

    if (name === "FN" && value.trim()) draft.name = value.trim();
    else if (name === "N") {
      const parts = value.split(";");
      const family = parts[0]?.trim();
      const given = parts[1]?.trim();
      if (family) draft.familyName = family;
      if (given) draft.givenName = given;
      if (!draft.name) {
        const assembled = [given, family].filter(Boolean).join(" ").trim();
        if (assembled) draft.name = assembled;
      }
    } else if (name === "ORG" && value.trim()) draft.organization = value.split(";")[0]?.trim();
    else if (name === "X-ABSHOWAS" && /company/i.test(value)) draft.showAsCompany = true;
    else if (name === "EMAIL" && !draft.email && value.trim()) draft.email = value.trim();
    else if (name === "TEL" && !draft.phone && value.trim()) draft.phone = value.trim();
    else if ((name === "URL" || name === "X-ABRELATEDNAMES") && !draft.website && /^https?:/i.test(value)) {
      draft.website = value.trim();
    } else if (name === "URL" && !draft.website && value.trim()) draft.website = value.trim();
  };

  let pending = "";

  const consumeLine = (line: string) => {
    if (isFold(line)) {
      if (skippingPhoto) return;
      if (includePhotos && photoLeft) {
        photoValue += line.slice(1);
        return;
      }
      pending += line.slice(1);
      return;
    }
    if (pending) applyLogicalLine(pending);
    pending = line;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    carry += decoder.decode(value, { stream: true });
    carry = carry.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let nl = carry.indexOf("\n");
    while (nl >= 0) {
      consumeLine(carry.slice(0, nl));
      carry = carry.slice(nl + 1);
      nl = carry.indexOf("\n");
    }
    if (bytesRead - lastTick > 512 * 1024) {
      lastTick = bytesRead;
      emit();
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  carry += decoder.decode();
  if (carry) consumeLine(carry.replace(/\r/g, ""));
  if (pending) applyLogicalLine(pending);
  if (draft) flushDraft(draft, contacts);
  emit();

  return { contacts, skippedPhotos, includePhotos, encoding };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(n > 40 * 1024 * 1024 ? 0 : 1)} MB`;
}
