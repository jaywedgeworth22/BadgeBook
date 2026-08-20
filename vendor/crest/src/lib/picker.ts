import { createContact, type Contact } from "./contacts";

type ContactInfo = {
  name?: string[];
  email?: string[];
  tel?: string[];
  icon?: Blob[];
};

type ContactsManager = {
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactInfo[]>;
  getProperties?: () => Promise<string[]>;
};

export function canPickDeviceContacts(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean((navigator as Navigator & { contacts?: ContactsManager }).contacts);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(blob);
  });
}

export async function pickDeviceContacts(): Promise<Contact[]> {
  const api = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
  if (!api) {
    throw new Error("This browser cannot read the phone address book. Add contacts by hand, or open Crest on Chrome for Android.");
  }
  const wanted = ["name", "email", "tel", "icon"];
  let properties = wanted;
  try {
    const available = await api.getProperties?.();
    if (available?.length) {
      properties = wanted.filter((p) => available.includes(p));
    }
  } catch {
    /* use defaults */
  }
  const picked = await api.select(properties, { multiple: true });
  const contacts: Contact[] = [];
  for (const row of picked) {
    const name = row.name?.[0]?.trim();
    if (!name) continue;
    let photoDataUrl: string | undefined;
    const icon = row.icon?.[0];
    if (icon) {
      try {
        photoDataUrl = await blobToDataUrl(icon);
      } catch {
        photoDataUrl = undefined;
      }
    }
    contacts.push(
      createContact({
        name,
        email: row.email?.[0],
        phone: row.tel?.[0],
        kind: "auto",
        source: "device",
        photoDataUrl,
        hadExistingPhoto: Boolean(photoDataUrl),
        crestApplied: false,
      }),
    );
  }
  return contacts;
}
