import {
  classifyContact,
  queryName,
  resolveIdentity,
  wantsSuggestion,
  type BookContact,
  type Confidence,
  type ContactClass,
  type IdentityVia,
} from "./classify.ts";
import { candidateUrls, type LogoHit } from "./logos.ts";

export type ReviewItem = {
  contact: BookContact;
  contactClass: ContactClass;
  query: string;
  domain?: string;
  via?: IdentityVia;
  candidates: LogoHit[];
  confidence: Confidence;
  flags: string[];
  selected: boolean;
  chosenIndex: number;
};

function confidenceFor(item: Omit<ReviewItem, "selected" | "chosenIndex" | "confidence">): Confidence {
  if (item.contactClass === "nonBrand") return "skip";
  if (item.contactClass === "person" && item.contact.hadExistingPhoto) return "skip";
  if (item.candidates.length === 0) return "skip";
  const best = item.candidates[0];
  let tier: Confidence = "medium";
  if (best.source === "preferred" || best.source === "simpleicons") tier = "high";
  if (best.source === "favicon") tier = "medium";
  if (item.via === "guess") tier = "medium";
  if (item.flags.includes("homonym-risk") && item.via !== "website" && item.via !== "email") {
    tier = "medium";
  }
  if (item.via === "guess" && best.source === "favicon") tier = "low";
  return tier;
}

export function matchContact(contact: BookContact): ReviewItem {
  const contactClass = classifyContact(contact);
  const { query, flags } = queryName(contact);
  if (contactClass === "nonBrand") {
    return {
      contact,
      contactClass,
      query,
      candidates: [],
      confidence: "skip",
      flags: [...flags, "non-brand"],
      selected: false,
      chosenIndex: 0,
    };
  }
  if (contactClass === "person" && contact.hadExistingPhoto) {
    return {
      contact,
      contactClass,
      query,
      candidates: [],
      confidence: "skip",
      flags: [...flags, "photo-protected"],
      selected: false,
      chosenIndex: 0,
    };
  }
  const identity = resolveIdentity(contact, query);
  if (identity) flags.push(`via-${identity.via}`);
  if (identity?.via === "guess") flags.push("guessed-domain");
  const candidates = identity ? candidateUrls(identity.domain) : [];
  const base = {
    contact,
    contactClass,
    query,
    domain: identity?.domain,
    via: identity?.via,
    candidates,
    flags,
  };
  const confidence = confidenceFor(base);
  return {
    ...base,
    confidence,
    selected: confidence === "high",
    chosenIndex: 0,
  };
}

export function matchBook(contacts: BookContact[]): ReviewItem[] {
  return contacts.filter((c) => wantsSuggestion(c, classifyContact(c)) || classifyContact(c) === "nonBrand").map(matchContact);
}

export function bucket(items: ReviewItem[]) {
  return {
    auto: items.filter((i) => i.confidence === "high"),
    review: items.filter((i) => i.confidence === "medium" || i.confidence === "low"),
    notFound: items.filter((i) => i.confidence === "skip"),
  };
}
