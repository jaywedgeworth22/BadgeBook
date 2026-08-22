import type { BookContact } from "./classify.ts";
import { getGoogleClientId } from "./settings.ts";

const CONTACTS_READ_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
const CONTACTS_WRITE_SCOPE = "https://www.googleapis.com/auth/contacts";
const PERSON_FIELDS = "names,emailAddresses,phoneNumbers,organizations,urls,photos";

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

type GisOauth = {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (resp: { access_token?: string; error?: string; error_description?: string }) => void;
    error_callback?: (err: { type?: string; message?: string }) => void;
  }) => TokenClient;
};

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GisOauth } };
  }
}

let cachedAccessToken: string | null = null;
let tokenHasWriteScope = false;

function loadGis(): Promise<GisOauth> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-contactlogo-gis]");
    if (existing) {
      existing.addEventListener("load", () => {
        const api = window.google?.accounts?.oauth2;
        if (api) resolve(api);
        else reject(new Error("Google sign-in failed to load"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.contactlogoGis = "1";
    script.onload = () => {
      const api = window.google?.accounts?.oauth2;
      if (api) resolve(api);
      else reject(new Error("Google sign-in failed to load"));
    };
    script.onerror = () => reject(new Error("Could not reach Google sign-in"));
    document.head.appendChild(script);
  });
}

export async function requestAccessToken(clientId: string, requireWrite = false): Promise<string> {
  if (cachedAccessToken && (!requireWrite || tokenHasWriteScope)) {
    return cachedAccessToken;
  }
  const oauth = await loadGis();
  const scope = requireWrite ? CONTACTS_WRITE_SCOPE : CONTACTS_READ_SCOPE;
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp) => {
        if (resp.access_token) {
          cachedAccessToken = resp.access_token;
          tokenHasWriteScope = requireWrite;
          resolve(resp.access_token);
        } else {
          reject(new Error(resp.error_description || resp.error || "Google access was denied"));
        }
      },
      error_callback: (err) => {
        reject(new Error(err.message || "Google sign-in was cancelled"));
      },
    });
    client.requestAccessToken({ prompt: requireWrite ? "consent" : "" });
  });
}

export type Person = {
  resourceName?: string;
  names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
  organizations?: Array<{ name?: string }>;
  urls?: Array<{ value?: string }>;
  photos?: Array<{ url?: string; default?: boolean }>;
};

async function fetchConnections(token: string, onProgress?: (n: number) => void): Promise<Person[]> {
  const people: Person[] = [];
  let pageToken = "";
  for (let page = 0; page < 12; page += 1) {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("personFields", PERSON_FIELDS);
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("sortOrder", "LAST_MODIFIED_DESCENDING");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(res.status === 403 ? "Google did not allow Contacts access." : "Could not read Google Contacts");
    }
    const data = (await res.json()) as { connections?: Person[]; nextPageToken?: string };
    people.push(...(data.connections ?? []));
    onProgress?.(people.length);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return people;
}

export function personToBookContact(person: Person): BookContact | null {
  const primary = person.names?.[0];
  const organization = person.organizations?.[0]?.name?.trim();
  const name = primary?.displayName?.trim() || organization;
  if (!name) return null;
  const photo = person.photos?.find((p) => p.url && !p.default);
  return {
    id: crypto.randomUUID(),
    displayName: name,
    givenName: primary?.givenName,
    familyName: primary?.familyName,
    organization,
    email: person.emailAddresses?.[0]?.value,
    phone: person.phoneNumbers?.[0]?.value,
    website: person.urls?.[0]?.value,
    hadExistingPhoto: Boolean(photo),
    importSource: "google",
    googleResourceName: person.resourceName,
  };
}

export async function importGoogleContacts(onProgress?: (n: number) => void): Promise<BookContact[]> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("GOOGLE_CONTACTS_NOT_CONFIGURED");
  }
  const token = await requestAccessToken(clientId, false);
  const people = await fetchConnections(token, onProgress);
  return people.map(personToBookContact).filter((c): c is BookContact => Boolean(c));
}

/** Update contact photo in Google People API */
export async function updateGoogleContactPhoto(
  resourceName: string,
  photoDataUrlOrBase64: string,
  token: string,
): Promise<void> {
  const base64Data = photoDataUrlOrBase64.includes(",")
    ? photoDataUrlOrBase64.split(",")[1]
    : photoDataUrlOrBase64;
  const url = `https://people.googleapis.com/v1/${encodeURIComponent(resourceName)}:updateContactPhoto`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ photoBytes: base64Data }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to update photo for ${resourceName}: ${res.status} ${errText}`);
  }
}
