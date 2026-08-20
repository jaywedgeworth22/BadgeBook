import { createContact, type Contact } from "@/lib/contacts";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  while (i < src.length) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

function col(header: string[], row: string[], ...names: string[]): string | undefined {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx >= 0 && row[idx]?.trim()) return row[idx]!.trim();
  }
  for (const name of names) {
    const idx = lower.findIndex((h) => h.startsWith(name.toLowerCase()));
    if (idx >= 0 && row[idx]?.trim()) return row[idx]!.trim();
  }
  return undefined;
}

export function looksLikeContactCsv(text: string): boolean {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  return (
    first.includes("given name") ||
    first.includes("family name") ||
    first.includes("e-mail") ||
    first.includes("email") ||
    first.includes("organization") ||
    first.includes("phone 1")
  );
}

export function parseGoogleCsv(text: string): Contact[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0] ?? [];
  const out: Contact[] = [];
  for (const row of rows.slice(1)) {
    const given = col(header, row, "Given Name", "First Name");
    const family = col(header, row, "Family Name", "Last Name");
    const name =
      col(header, row, "Name") ||
      [given, family].filter(Boolean).join(" ").trim() ||
      col(header, row, "Organization Name", "Organization");
    if (!name) continue;
    const organization = col(header, row, "Organization Name", "Organization", "Company");
    const email = col(header, row, "E-mail 1 - Value", "E-mail Address", "Email", "Email Address");
    const phone = col(header, row, "Phone 1 - Value", "Mobile Phone", "Phone", "Home Phone", "Business Phone");
    const website = col(header, row, "Website 1 - Value", "Web Page", "Website");
    const photo = col(header, row, "Photo", "Photo 1");
    out.push(
      createContact({
        name,
        givenName: given,
        familyName: family,
        organization,
        email,
        phone,
        website,
        hadExistingPhoto: Boolean(photo),
        crestApplied: false,
        kind: "auto",
        source: "google",
      }),
    );
  }
  return out;
}
