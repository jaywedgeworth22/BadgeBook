import { parseGoogleCsv, looksLikeContactCsv } from "@/lib/google-csv";
import { importVcardFile, type VcardImportProgress, type VcardImportResult } from "@/lib/vcard-import";
import type { Contact } from "@/lib/contacts";

export async function importAddressFile(
  file: File,
  opts: { onProgress?: (p: VcardImportProgress) => void } = {},
): Promise<VcardImportResult> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const isCsv = name.endsWith(".csv") || type.includes("csv");
  if (isCsv) {
    const text = await file.text();
    if (!looksLikeContactCsv(text)) {
      throw new Error("That spreadsheet does not look like a Google or Outlook contact export.");
    }
    const contacts = parseGoogleCsv(text);
    return { contacts, skippedPhotos: 0, includePhotos: false, encoding: "utf-8" };
  }
  return importVcardFile(file, opts);
}

export function googleExportHelp(): void {
  window.open("https://contacts.google.com/", "_blank", "noopener,noreferrer");
}

export function describeImport(added: number, contacts: Contact[], skippedPhotos: number): string {
  if (added === 0) return "Those contacts are already in Crest";
  const fromGoogle = contacts.some((c) => c.source === "google") ? " from Google" : "";
  const skip = skippedPhotos ? ` Existing photos were skipped so a large card would fit.` : "";
  return `Imported ${added} contact${added === 1 ? "" : "s"}${fromGoogle}.${skip}`;
}

export { type VcardImportProgress };
