import { classifyContact, type Contact } from "@/lib/contacts";
import { resolveContactIdentity, type ContactIdentity } from "@/lib/identity";
import { composeContactPhoto, type LogoResult } from "@/lib/logos";

export type ScanItem = {
  contact: Contact;
  preview?: string;
  domain?: string;
  source?: string;
  via?: ContactIdentity["via"];
  failed?: boolean;
  settled?: boolean;
};

function yieldUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i] as T);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

export async function runCompanyScan(
  targets: Contact[],
  onProgress: (index: number, contact: Contact) => void,
): Promise<ScanItem[]> {
  const identities = new Map<string, ContactIdentity | undefined>();
  let resolved = 0;
  await mapPool(targets, 4, async (contact) => {
    onProgress(resolved, contact);
    identities.set(contact.id, await resolveContactIdentity(contact));
    resolved += 1;
    if (resolved % 2 === 0) await yieldUi();
    return contact.id;
  });

  const byDomain = new Map<string, LogoResult | "miss">();
  const unique: { domain: string; skip: string[] }[] = [];
  const seen = new Set<string>();

  for (const contact of targets) {
    const domain = identities.get(contact.id)?.domain ?? classifyContact(contact).domain;
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    unique.push({ domain, skip: contact.rejectedSources ?? [] });
  }

  let done = 0;
  await mapPool(unique, 4, async ({ domain, skip }) => {
    const sample =
      targets.find((c) => identities.get(c.id)?.domain === domain) ?? targets[0]!;
    onProgress(Math.min(targets.length - 1, done), sample);
    try {
      const photo = await composeContactPhoto(domain, skip, sample.name);
      byDomain.set(domain, photo);
    } catch {
      byDomain.set(domain, "miss");
    }
    done += 1;
    if (done % 2 === 0) await yieldUi();
    return domain;
  });

  return targets.map((contact) => {
    const identity = identities.get(contact.id);
    const domain = identity?.domain ?? classifyContact(contact).domain;
    if (!domain) return { contact, failed: true };
    const hit = byDomain.get(domain);
    if (!hit || hit === "miss") return { contact, domain, via: identity?.via, failed: true };
    return {
      contact: {
        ...contact,
        proposedPhotoUrl: hit.dataUrl,
        proposedDomain: domain,
        proposedSource: hit.source,
      },
      preview: hit.dataUrl,
      domain,
      source: hit.source,
      via: identity?.via,
    };
  });
}
