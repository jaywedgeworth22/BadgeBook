import { isBusinessPhone, lookupPhoneDomain } from "@/lib/phones";

export type ContactKind = "person" | "company" | "auto";

export type Contact = {
  id: string;
  name: string;
  givenName?: string;
  familyName?: string;
  organization?: string;
  email?: string;
  phone?: string;
  website?: string;
  /** User override. `auto` uses detection. */
  kind: ContactKind;
  /** Applied profile photo as a data URL. */
  photoDataUrl?: string;
  /** True when the imported/device card already had a picture. */
  hadExistingPhoto?: boolean;
  /** True only after the user approved a Crest logo. */
  crestApplied?: boolean;
  /** Proposed logo from the last scan. */
  proposedPhotoUrl?: string;
  proposedDomain?: string;
  /** Which library source produced the current proposal. */
  proposedSource?: string;
  /** Sources the user already rejected for this contact. */
  rejectedSources?: string[];
  source: "sample" | "device" | "manual" | "import" | "google";
  updatedAt: number;
};

export type Classification = {
  isCompany: boolean;
  confidence: number;
  reasons: string[];
  domain?: string;
  displayName: string;
};

const CONSUMER_EMAIL = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "me.com",
  "mac.com",
  "live.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "hey.com",
  "fastmail.com",
  "gmx.com",
  "ymail.com",
  "googlemail.com",
  "comcast.net",
  "sbcglobal.net",
  "att.net",
  "verizon.net",
  "bellsouth.net",
  "cox.net",
  "charter.net",
  "earthlink.net",
]);

const LEGAL_RE =
  /\b(inc\.?|incorporated|llc|l\.l\.c\.?|ltd\.?|limited|corp\.?|corporation|gmbh|ag|plc|holdings|group|p\.c\.|llp|company|energy|airlines?|airways|bank|insurance|electric|utility|utilities|hospital|university|church|ministry|ministries)\b/i;

const COMPANY_DOMAINS: Record<string, string> = {
  apple: "apple.com",
  "apple inc": "apple.com",
  google: "google.com",
  alphabet: "abc.xyz",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  meta: "meta.com",
  facebook: "facebook.com",
  instagram: "instagram.com",
  tesla: "tesla.com",
  nvidia: "nvidia.com",
  netflix: "netflix.com",
  spotify: "spotify.com",
  adobe: "adobe.com",
  salesforce: "salesforce.com",
  oracle: "oracle.com",
  ibm: "ibm.com",
  intel: "intel.com",
  cisco: "cisco.com",
  stripe: "stripe.com",
  paypal: "paypal.com",
  visa: "visa.com",
  mastercard: "mastercard.com",
  "american express": "americanexpress.com",
  amex: "americanexpress.com",
  chase: "chase.com",
  jpmorgan: "jpmorganchase.com",
  "jp morgan": "jpmorganchase.com",
  "jpmorgan chase": "jpmorganchase.com",
  "bank of america": "bankofamerica.com",
  "wells fargo": "wellsfargo.com",
  citi: "citi.com",
  citibank: "citi.com",
  citigroup: "citi.com",
  geico: "geico.com",
  "state farm": "statefarm.com",
  "state farm insurance": "statefarm.com",
  allstate: "allstate.com",
  "allstate insurance": "allstate.com",
  usaa: "usaa.com",
  "usaa insurance": "usaa.com",
  verizon: "verizon.com",
  "at&t": "att.com",
  att: "att.com",
  "t-mobile": "t-mobile.com",
  tmobile: "t-mobile.com",
  "united airlines": "united.com",
  united: "united.com",
  "american airlines": "aa.com",
  delta: "delta.com",
  "delta air lines": "delta.com",
  "delta airlines": "delta.com",
  southwest: "southwest.com",
  "southwest airlines": "southwest.com",
  jetblue: "jetblue.com",
  "alaska airlines": "alaskaair.com",
  fedex: "fedex.com",
  ups: "ups.com",
  usps: "usps.com",
  "the home depot": "homedepot.com",
  "home depot": "homedepot.com",
  lowes: "lowes.com",
  "lowe's": "lowes.com",
  costco: "costco.com",
  walmart: "walmart.com",
  target: "target.com",
  starbucks: "starbucks.com",
  mcdonalds: "mcdonalds.com",
  "mcdonald's": "mcdonalds.com",
  uber: "uber.com",
  lyft: "lyft.com",
  doordash: "doordash.com",
  airbnb: "airbnb.com",
  nike: "nike.com",
  samsung: "samsung.com",
  sony: "sony.com",
  ford: "ford.com",
  bmw: "bmw.com",
  "centerpoint energy": "centerpointenergy.com",
  centerpoint: "centerpointenergy.com",
  "x ai": "x.ai",
  xai: "x.ai",
  square: "squareup.com",
  "capital one": "capitalone.com",
  discover: "discover.com",
  intuit: "intuit.com",
  turbotax: "turbotax.intuit.com",
  quickbooks: "quickbooks.intuit.com",
  "h&r": "hrblock.com",
  "h&r block": "hrblock.com",
  "h and r block": "hrblock.com",
  "edward jones": "edwardjones.com",
  "charles schwab": "schwab.com",
  "td ameritrade": "tdameritrade.com",
  etrade: "etrade.com",
  robinhood: "robinhood.com",
  coinbase: "coinbase.com",
  "american tower": "americantower.com",
  "crown castle": "crowncastle.com",
  "waste management": "wm.com",
  republic: "republicservices.com",
  "republic services": "republicservices.com",
  "waste connections": "wasteconnections.com",
  "texas instruments": "ti.com",
  qualcomm: "qualcomm.com",
  broadcom: "broadcom.com",
  amd: "amd.com",
  "advanced micro devices": "amd.com",
  palantir: "palantir.com",
  snowflake: "snowflake.com",
  databricks: "databricks.com",
  servicenow: "servicenow.com",
  workday: "workday.com",
  autodesk: "autodesk.com",
  "electronic arts": "ea.com",
  activision: "activision.com",
  "take-two": "take2games.com",
  roblox: "roblox.com",
  unity: "unity.com",
  "epic games": "epicgames.com",
  valve: "valvesoftware.com",
  steam: "steampowered.com",
  comcast: "xfinity.com",
  xfinity: "xfinity.com",
  spectrum: "spectrum.com",
  progressive: "progressive.com",
  "liberty mutual": "libertymutual.com",
  farmers: "farmers.com",
  nationwide: "nationwide.com",
  heb: "heb.com",
  "h-e-b": "heb.com",
  kroger: "kroger.com",
  randalls: "randalls.com",
  safeway: "safeway.com",
  publix: "publix.com",
  walgreens: "walgreens.com",
  cvs: "cvs.com",
  "best buy": "bestbuy.com",
  "macy's": "macys.com",
  macys: "macys.com",
  hertz: "hertz.com",
  enterprise: "enterprise.com",
  avis: "avis.com",
  hilton: "hilton.com",
  marriott: "marriott.com",
  hyatt: "hyatt.com",
  fidelity: "fidelity.com",
  vanguard: "vanguard.com",
  reliant: "reliant.com",
  "pg&e": "pge.com",
  "duke energy": "duke-energy.com",
  amtrak: "amtrak.com",
};

const LEGAL_STRIP =
  /\s*,?\s*(inc\.?|incorporated|llc|l\.l\.c\.?|ltd\.?|limited|corp\.?|corporation|co\.?|company|gmbh|ag|plc|holdings|group|llc\.|p\.c\.|llp)\s*$/i;

const LOCATIONISH =
  /\b(rd|road|st|street|blvd|ave|avenue|dr|drive|ln|lane|hwy|fwy|pkwy|suite|ste|unit|store|shop|plaza|center|centre|mall|near|at|in|#\d*|\d{2,5}|cypress|houston|dallas|austin|tx|texas|usa)\b/i;

/** Drop store locations like "(Mason Rd in Cypress)" or "[#142]". */
export function stripNameExtras(name: string): string {
  return name
    .replace(/\s*[\(\[\{][^)\]\}]*[\)\]\}]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeCompanyKey(name: string): string {
  return stripNameExtras(name)
    .replace(LEGAL_STRIP, "")
    .replace(/[.,'"’]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function domainFromEmail(email?: string): string | undefined {
  if (!email || !email.includes("@")) return undefined;
  return email.split("@")[1]?.trim().toLowerCase();
}

export function isConsumerEmail(email?: string): boolean {
  const domain = domainFromEmail(email);
  return Boolean(domain && CONSUMER_EMAIL.has(domain));
}

export function lookupCompanyDomain(name: string): string | undefined {
  if (!name.trim()) return undefined;
  const key = normalizeCompanyKey(name);
  if (!key) return undefined;
  if (COMPANY_DOMAINS[key]) return COMPANY_DOMAINS[key];
  const nospace = key.replace(/\s+/g, "");
  if (COMPANY_DOMAINS[nospace]) return COMPANY_DOMAINS[nospace];

  const words = key.split(" ").filter(Boolean);
  for (let i = words.length - 1; i >= 1; i -= 1) {
    const head = words.slice(0, i).join(" ");
    const tail = words.slice(i).join(" ");
    const domain = COMPANY_DOMAINS[head] ?? COMPANY_DOMAINS[head.replace(/\s+/g, "")];
    if (domain && LOCATIONISH.test(tail)) return domain;
  }
  return undefined;
}

export function domainFromWebsite(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    const withProto = website.includes("://") ? website : `https://${website}`;
    const host = new URL(withProto).hostname.replace(/^www\./, "");
    return host || undefined;
  } catch {
    return undefined;
  }
}

export function guessDomain(name: string): string | undefined {
  const known = lookupCompanyDomain(name);
  if (known) return known;
  const key = normalizeCompanyKey(name)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
  if (key.length >= 3 && key.length <= 24) return `${key}.com`;
  return undefined;
}

export function resolveDomain(contact: Contact): string | undefined {
  const fromSite = domainFromWebsite(contact.website);
  if (fromSite) return fromSite;
  const fromEmail = domainFromEmail(contact.email);
  if (fromEmail && !CONSUMER_EMAIL.has(fromEmail)) return fromEmail;
  const fromPhone = lookupPhoneDomain(contact.phone);
  if (fromPhone) return fromPhone;
  if (contact.organization) {
    const d = lookupCompanyDomain(contact.organization);
    if (d) return d;
  }
  return lookupCompanyDomain(contact.name);
}

function looksLikePersonName(name: string): boolean {
  const cleaned = stripNameExtras(name).replace(/,/g, " ");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (LEGAL_RE.test(cleaned)) return false;
  return parts.every((p) => /^[A-Za-z][A-Za-z'.-]{1,30}$/.test(p));
}

/** Lone first or last that is a firm, with no personal email. */
export function inferCompanyOrganization(
  contact: Pick<Contact, "name" | "givenName" | "familyName" | "organization" | "email" | "phone">,
): string | undefined {
  if (contact.organization?.trim()) return stripNameExtras(contact.organization);
  if (isConsumerEmail(contact.email)) return undefined;

  const given = stripNameExtras(contact.givenName ?? "");
  const family = stripNameExtras(contact.familyName ?? "");
  const onlyGiven = Boolean(given && !family);
  const onlyFamily = Boolean(family && !given);
  const unstructured = !given && !family;
  if (!onlyGiven && !onlyFamily && !unstructured) return undefined;

  const candidate = stripNameExtras(onlyGiven ? given : onlyFamily ? family : contact.name);
  if (!candidate || looksLikePersonName(candidate)) return undefined;
  if (lookupCompanyDomain(candidate)) return candidate;

  const personalPhone =
    Boolean(contact.phone) && !isBusinessPhone(contact.phone) && !lookupPhoneDomain(contact.phone);
  if (LEGAL_RE.test(candidate) && !personalPhone) return candidate;
  return undefined;
}

export function promoteCompanyContact<T extends Contact>(contact: T): T {
  const organization = inferCompanyOrganization(contact);
  if (!organization || contact.organization === organization) return contact;
  return { ...contact, organization };
}

export function classifyContact(contact: Contact): Classification {
  const reasons: string[] = [];
  let score = 0;
  const name = stripNameExtras(contact.name);
  const org = stripNameExtras(contact.organization ?? "") || inferCompanyOrganization(contact);

  if (contact.kind === "company") {
    return {
      isCompany: true,
      confidence: 100,
      reasons: ["Marked as a company"],
      domain: resolveDomain({ ...contact, organization: org || contact.organization }),
      displayName: org || name,
    };
  }
  if (contact.kind === "person") {
    return {
      isCompany: false,
      confidence: 0,
      reasons: ["Marked as a person"],
      displayName: contact.name.trim(),
    };
  }

  const knownName = lookupCompanyDomain(name);
  if (knownName) {
    score += 48;
    reasons.push("Matches a known company");
  }

  if (LEGAL_RE.test(name) || (org && !looksLikePersonName(name) && LEGAL_RE.test(org))) {
    score += 34;
    reasons.push("Legal company suffix");
  }

  if (org) {
    const same = org.toLowerCase() === name.toLowerCase();
    if (same) {
      score += 36;
      reasons.push("Name is the organization");
    } else if (!looksLikePersonName(name)) {
      score += 22;
      reasons.push("Has a company field");
    }
  }

  const emailDomain = domainFromEmail(contact.email);
  if (emailDomain && !CONSUMER_EMAIL.has(emailDomain) && !looksLikePersonName(name)) {
    score += 18;
    reasons.push("Work email domain");
  }

  if (contact.website && domainFromWebsite(contact.website) && !looksLikePersonName(name)) {
    score += 12;
    reasons.push("Has a company website");
  }

  if (lookupPhoneDomain(contact.phone) && !looksLikePersonName(name)) {
    score += 28;
    reasons.push("Phone matches a known company");
  } else if (isBusinessPhone(contact.phone) && !looksLikePersonName(name)) {
    score += 10;
    reasons.push("Business phone number");
  }

  if (looksLikePersonName(name) && !knownName) {
    score -= 42;
    reasons.push("Looks like a personal name");
  }

  if (org && looksLikePersonName(contact.name) && !knownName) {
    reasons.push("Works at a company — not the company itself");
  }

  const isCompany = score >= 28;
  return {
    isCompany,
    confidence: Math.max(0, Math.min(100, score)),
    reasons: isCompany
      ? reasons.filter((r) => r !== "Looks like a personal name")
      : reasons,
    domain: isCompany ? resolveDomain({ ...contact, organization: org || contact.organization }) : undefined,
    displayName: org || name || contact.name,
  };
}

export function initials(name: string): string {
  const parts = stripNameExtras(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function needsPhoto(contact: Contact, classification: Classification): boolean {
  if (!classification.isCompany) return false;
  if (contact.crestApplied) return false;
  return !contact.photoDataUrl && !contact.hadExistingPhoto;
}

export function hasExistingPhoto(contact: Contact): boolean {
  return Boolean(contact.hadExistingPhoto || (contact.photoDataUrl && !contact.crestApplied));
}

export function wantsSuggestion(contact: Contact, classification: Classification): boolean {
  if (!classification.isCompany || contact.crestApplied) return false;
  return needsPhoto(contact, classification) || hasExistingPhoto(contact);
}

function id(): string {
  return crypto.randomUUID();
}

export function createContact(
  partial: Omit<Contact, "id" | "updatedAt" | "source"> & { source?: Contact["source"] },
): Contact {
  const organization = partial.organization?.trim() || inferCompanyOrganization(partial as Contact);
  return {
    ...partial,
    organization,
    id: id(),
    source: partial.source ?? "manual",
    updatedAt: Date.now(),
  };
}

export function sampleContacts(): Contact[] {
  const company = (
    name: string,
    extra: Partial<Contact> = {},
  ): Contact =>
    createContact({
      name,
      organization: extra.organization ?? name,
      email: extra.email,
      phone: extra.phone,
      website: extra.website,
      kind: extra.kind ?? "auto",
      source: "sample",
    });

  return [
    company("Apple Inc", { email: "billing@email.apple.com" }),
    company("Delta Air Lines", { email: "correspondence@delta.com" }),
    company("CenterPoint Energy", { email: "centerpoint@centerpointenergy.com" }),
    company("AT&T", { email: "att-mail@att.com" }),
    company("The Home Depot", { email: "homedepot@email.homedepot.com" }),
    company("Verizon", { email: "verizon@verizonwireless.com" }),
    company("Chase", { email: "chase@email.chase.com" }),
    company("Geico", { email: "service@geico.com" }),
    company("USAA", { email: "usaa@usaa.com" }),
    company("FedEx", { email: "fedex@fedex.com" }),
    company("United Airlines", { email: "unitedairlines@united.com" }),
    createContact({
      name: "Maya Chen",
      email: "maya@hey.com",
      kind: "auto",
      source: "sample",
    }),
    createContact({
      name: "James Whitaker",
      email: "jwhitaker@gmail.com",
      phone: "(713) 555-0142",
      kind: "auto",
      source: "sample",
    }),
  ];
}
