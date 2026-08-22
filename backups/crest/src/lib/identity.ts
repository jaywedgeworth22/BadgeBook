import {
  domainFromEmail,
  domainFromWebsite,
  guessDomain,
  lookupCompanyDomain,
  stripNameExtras,
  type Contact,
} from "@/lib/contacts";
import { lookupPhoneDomain } from "@/lib/phones";

const CONSUMER = new Set([
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
  "googlemail.com",
]);

export type IdentityVia = "website" | "email" | "catalog" | "phone" | "name" | "guess";

export type ContactIdentity = {
  domain: string;
  via: IdentityVia;
  label?: string;
};

const mem = new Map<string, ContactIdentity | null>();

function queryKey(contact: Contact): string {
  return [
    (contact.organization || stripNameExtras(contact.name)).trim().toLowerCase(),
    contact.phone ?? "",
    contact.email ?? "",
    contact.website ?? "",
  ].join("|");
}

/** Fast local resolve — email, site, known name, known phone. No network. */
export function resolveLocalIdentity(contact: Contact): ContactIdentity | undefined {
  const site = domainFromWebsite(contact.website);
  if (site) return { domain: site, via: "website" };

  const email = domainFromEmail(contact.email);
  if (email && !CONSUMER.has(email)) return { domain: email, via: "email" };

  const named =
    lookupCompanyDomain(contact.organization || "") ?? lookupCompanyDomain(contact.name);
  if (named) return { domain: named, via: "catalog" };

  const phone = lookupPhoneDomain(contact.phone);
  if (phone) return { domain: phone, via: "phone" };

  return undefined;
}

export async function resolveContactIdentity(contact: Contact): Promise<ContactIdentity | undefined> {
  const local = resolveLocalIdentity(contact);
  if (local) return local;

  const key = queryKey(contact);
  if (mem.has(key)) return mem.get(key) ?? undefined;

  const name = stripNameExtras(contact.organization || contact.name);
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (contact.phone) params.set("phone", contact.phone);

  if (!params.has("name") && !params.has("phone")) {
    mem.set(key, null);
    return undefined;
  }

  try {
    const res = await fetch(`/api/resolve?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { domain?: string; source?: string; label?: string };
      if (data.domain) {
        const via: IdentityVia = data.source === "phone" ? "phone" : data.source === "catalog" ? "catalog" : "name";
        const hit = { domain: data.domain, via, label: data.label };
        mem.set(key, hit);
        return hit;
      }
    }
  } catch {
    /* fall through to guess */
  }

  const guessed = guessDomain(contact.organization || stripNameExtras(contact.name));
  if (guessed) {
    const hit = { domain: guessed, via: "guess" as const };
    mem.set(key, hit);
    return hit;
  }

  mem.set(key, null);
  return undefined;
}
