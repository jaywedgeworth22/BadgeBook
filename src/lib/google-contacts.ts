import { createContact, type Contact } from "@/lib/contacts";

const CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
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

export async function googleContactsClientId(): Promise<string> {
  const fromEnv = String(import.meta.env.VITE_GOOGLE_CONTACTS_CLIENT_ID ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const res = await fetch("/api/google/config");
    if (!res.ok) return "";
    const data = (await res.json()) as { clientId?: string };
    return data.clientId?.trim() ?? "";
  } catch {
    return "";
  }
}

function loadGis(): Promise<GisOauth> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-crest-gis]");
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
    script.dataset.crestGis = "1";
    script.onload = () => {
      const api = window.google?.accounts?.oauth2;
      if (api) resolve(api);
      else reject(new Error("Google sign-in failed to load"));
    };
    script.onerror = () => reject(new Error("Could not reach Google sign-in"));
    document.head.appendChild(script);
  });
}

async function requestAccessToken(clientId: string): Promise<string> {
  const oauth = await loadGis();
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: CONTACTS_SCOPE,
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp.error_description || resp.error || "Google access was denied"));
      },
      error_callback: (err) => {
        reject(new Error(err.message || "Google sign-in was cancelled"));
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

type Person = {
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
      const detail = await res.text().catch(() => "");
      throw new Error(res.status === 403 ? "Google did not allow Contacts access." : detail || "Could not read Google Contacts");
    }
    const data = (await res.json()) as { connections?: Person[]; nextPageToken?: string };
    people.push(...(data.connections ?? []));
    onProgress?.(people.length);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return people;
}

function personToContact(person: Person): Contact | null {
  const primary = person.names?.[0];
  const organization = person.organizations?.[0]?.name?.trim();
  const name = primary?.displayName?.trim() || organization;
  if (!name) return null;
  const photo = person.photos?.find((p) => p.url && !p.default);
  return createContact({
    name,
    givenName: primary?.givenName,
    familyName: primary?.familyName,
    organization,
    email: person.emailAddresses?.[0]?.value,
    phone: person.phoneNumbers?.[0]?.value,
    website: person.urls?.[0]?.value,
    hadExistingPhoto: Boolean(photo),
    crestApplied: false,
    kind: "auto",
    source: "google",
  });
}

export async function importGoogleContacts(onProgress?: (n: number) => void): Promise<Contact[]> {
  const clientId = await googleContactsClientId();
  if (!clientId) {
    throw new Error("GOOGLE_CONTACTS_NOT_CONFIGURED");
  }
  const token = await requestAccessToken(clientId);
  const people = await fetchConnections(token, onProgress);
  return people.map(personToContact).filter((c): c is Contact => Boolean(c));
}
