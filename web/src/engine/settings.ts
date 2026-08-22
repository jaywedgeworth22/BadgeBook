const STORAGE_KEY = "contactlogo.googleClientId";

export function getGoogleClientId(): string {
  const viteEnv = (import.meta as { env?: { VITE_GOOGLE_CONTACTS_CLIENT_ID?: string } }).env;
const fromEnv = String(viteEnv?.VITE_GOOGLE_CONTACTS_CLIENT_ID ?? "").trim();
  if (typeof localStorage === "undefined") return fromEnv;
  return localStorage.getItem(STORAGE_KEY)?.trim() || fromEnv;
}

export function setGoogleClientId(value: string): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = value.trim();
  if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
  else localStorage.removeItem(STORAGE_KEY);
}
