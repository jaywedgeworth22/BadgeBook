import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  classifyContact,
  createContact,
  needsPhoto,
  promoteCompanyContact,
  sampleContacts,
  wantsSuggestion,
  type Contact,
  type ContactKind,
} from "@/lib/contacts";
import { crestPersistStorage } from "@/lib/idb-storage";

export type FilterTab = "all" | "companies" | "needs";
export type AppView = "home" | "scan" | "settings" | "detail" | "add";

export type AddressBackup = {
  id: string;
  createdAt: number;
  reason: "before-scan" | "before-save" | "before-reset" | "before-import" | "manual";
  contacts: Contact[];
};

type CrestState = {
  hydrated: boolean;
  onboarded: boolean;
  contacts: Contact[];
  lastBackup: AddressBackup | null;
  filter: FilterTab;
  query: string;
  view: AppView;
  selectedId: string | null;
  markHydrated: () => void;
  completeOnboarding: () => void;
  setFilter: (filter: FilterTab) => void;
  setQuery: (query: string) => void;
  setView: (view: AppView) => void;
  openContact: (id: string) => void;
  addContact: (contact: Omit<Contact, "id" | "updatedAt" | "source"> & { source?: Contact["source"] }) => string;
  importContacts: (incoming: Contact[]) => number;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  removeContact: (id: string) => void;
  applyPhoto: (id: string, photoDataUrl: string, domain?: string, logoSource?: string) => void;
  applyProposed: (ids: string[]) => void;
  setProposed: (id: string, proposedPhotoUrl: string, domain: string, logoSource?: string) => void;
  rejectSource: (id: string, source: string) => void;
  clearPhoto: (id: string) => void;
  skipProposed: (id: string) => void;
  setKind: (id: string, kind: ContactKind) => void;
  createBackup: (reason: AddressBackup["reason"]) => AddressBackup;
  restoreBackup: () => boolean;
  resetSample: () => void;
  promoteAllCompanies: () => number;
};

function slimContact(c: Contact): Contact {
  return {
    ...c,
    proposedPhotoUrl: undefined,
    rejectedSources: undefined,
    photoDataUrl: c.photoDataUrl && c.photoDataUrl.length > 180_000 ? undefined : c.photoDataUrl,
  };
}

function snapshotContacts(contacts: Contact[]): Contact[] {
  const dropPhotos = contacts.length > 250;
  return contacts.map((c) => ({
    ...slimContact(c),
    photoDataUrl: dropPhotos ? undefined : slimContact(c).photoDataUrl,
  }));
}

export const useCrest = create<CrestState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      contacts: sampleContacts(),
      lastBackup: null,
      filter: "all",
      query: "",
      view: "home",
      selectedId: null,
      markHydrated: () => set({ hydrated: true }),
      completeOnboarding: () => set({ onboarded: true }),
      setFilter: (filter) => set({ filter }),
      setQuery: (query) => set({ query }),
      setView: (view) => set({ view, selectedId: view === "detail" ? get().selectedId : null }),
      openContact: (id) => set({ view: "detail", selectedId: id }),
      addContact: (partial) => {
        const contact = createContact(partial);
        set({ contacts: [contact, ...get().contacts], view: "detail", selectedId: contact.id });
        return contact.id;
      },
      importContacts: (incoming) => {
        if (incoming.length === 0) return 0;
        const existing = get().contacts;
        const keyOf = (c: Contact) =>
          `${c.name.trim().toLowerCase()}|${(c.email ?? "").toLowerCase()}|${c.phone ?? ""}`;
        const seen = new Set(existing.map(keyOf));
        const next: Contact[] = [];
        for (const c of incoming) {
          const key = keyOf(c);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(promoteCompanyContact(c));
        }
        if (!next.length) return 0;
        const dropSample = incoming.length >= 8;
        const base = dropSample ? existing.filter((c) => c.source !== "sample") : existing;
        set({ contacts: [...next, ...base] });
        return next.length;
      },
      updateContact: (id, patch) =>
        set({
          contacts: get().contacts.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
          ),
        }),
      removeContact: (id) =>
        set({
          contacts: get().contacts.filter((c) => c.id !== id),
          view: "home",
          selectedId: null,
        }),
      applyPhoto: (id, photoDataUrl, domain, logoSource) =>
        set({
          contacts: get().contacts.map((c) =>
            c.id === id
              ? {
                  ...c,
                  photoDataUrl,
                  crestApplied: true,
                  proposedPhotoUrl: undefined,
                  proposedDomain: domain ?? c.proposedDomain,
                  proposedSource: logoSource ?? c.proposedSource,
                  updatedAt: Date.now(),
                }
              : c,
          ),
        }),
      applyProposed: (ids) => {
        const setIds = new Set(ids);
        set({
          contacts: get().contacts.map((c) =>
            setIds.has(c.id) && c.proposedPhotoUrl
              ? { ...c, photoDataUrl: c.proposedPhotoUrl, proposedPhotoUrl: undefined, crestApplied: true, updatedAt: Date.now() }
              : c,
          ),
        });
      },
      setProposed: (id, proposedPhotoUrl, domain, logoSource) =>
        set({
          contacts: get().contacts.map((c) =>
            c.id === id
              ? {
                  ...c,
                  proposedPhotoUrl,
                  proposedDomain: domain,
                  proposedSource: logoSource ?? c.proposedSource,
                  updatedAt: Date.now(),
                }
              : c,
          ),
        }),
      rejectSource: (id, source) =>
        set({
          contacts: get().contacts.map((c) => {
            if (c.id !== id) return c;
            const rejected = new Set(c.rejectedSources ?? []);
            rejected.add(source);
            return { ...c, rejectedSources: [...rejected], updatedAt: Date.now() };
          }),
        }),
      clearPhoto: (id) =>
        set({
          contacts: get().contacts.map((c) =>
            c.id === id
              ? {
                  ...c,
                  photoDataUrl: undefined,
                  proposedPhotoUrl: undefined,
                  proposedSource: undefined,
                  crestApplied: false,
                  updatedAt: Date.now(),
                }
              : c,
          ),
        }),
      skipProposed: (id) =>
        set({
          contacts: get().contacts.map((c) =>
            c.id === id
              ? { ...c, proposedPhotoUrl: undefined, proposedSource: undefined, updatedAt: Date.now() }
              : c,
          ),
        }),
      setKind: (id, kind) =>
        set({
          contacts: get().contacts.map((c) =>
            c.id === id ? { ...c, kind, updatedAt: Date.now() } : c,
          ),
        }),
      createBackup: (reason) => {
        const backup: AddressBackup = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          reason,
          contacts: snapshotContacts(get().contacts),
        };
        set({ lastBackup: backup });
        return backup;
      },
      restoreBackup: () => {
        const backup = get().lastBackup;
        if (!backup) return false;
        set({
          contacts: snapshotContacts(backup.contacts),
          view: "home",
          selectedId: null,
          query: "",
        });
        return true;
      },
      resetSample: () =>
        set({
          contacts: sampleContacts(),
          filter: "all",
          query: "",
          view: "home",
          selectedId: null,
        }),
      promoteAllCompanies: () => {
        const contacts = get().contacts;
        let moved = 0;
        const next = contacts.map((c) => {
          const promoted = promoteCompanyContact(c);
          if (promoted.organization && promoted.organization !== c.organization) moved += 1;
          return promoted;
        });
        if (moved) set({ contacts: next });
        return moved;
      },
    }),
    {
      name: "crest-app-v1",
      storage: crestPersistStorage,
      partialize: (s) => ({
        onboarded: s.onboarded,
        contacts: s.contacts.map(slimContact),
        lastBackup: s.lastBackup
          ? { ...s.lastBackup, contacts: snapshotContacts(s.lastBackup.contacts) }
          : null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.contacts) {
          state.contacts = state.contacts.map((c) => {
            const promoted = promoteCompanyContact(c);
            if (promoted.photoDataUrl && promoted.crestApplied === undefined) {
              return { ...promoted, crestApplied: true };
            }
            return promoted;
          });
        }
        state?.markHydrated();
      },
    },
  ),
);

export function useVisibleContacts(): Contact[] {
  const contacts = useCrest((s) => s.contacts);
  const filter = useCrest((s) => s.filter);
  const query = useCrest((s) => s.query);
  const q = query.trim().toLowerCase();
  return contacts.filter((c) => {
    const cls = classifyContact(c);
    if (filter === "companies" && !cls.isCompany) return false;
    if (filter === "needs" && !needsPhoto(c, cls)) return false;
    if (!q) return true;
    const hay = `${c.name} ${c.organization ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export function useStats() {
  const contacts = useCrest((s) => s.contacts);
  let companies = 0;
  let missing = 0;
  let filled = 0;
  for (const c of contacts) {
    const cls = classifyContact(c);
    if (!cls.isCompany) continue;
    companies += 1;
    if (c.photoDataUrl) filled += 1;
    else if (c.hadExistingPhoto) filled += 1;
    else missing += 1;
  }
  return { total: contacts.length, companies, missing, filled };
}

export function collectScanTargets(contacts: Contact[]): Contact[] {
  const out: Contact[] = [];
  for (const c of contacts) {
    const promoted = promoteCompanyContact(c);
    const cls = classifyContact(promoted);
    if (wantsSuggestion(promoted, cls)) out.push(promoted);
  }
  return out;
}
