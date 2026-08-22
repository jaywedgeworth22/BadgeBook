import { createJSONStorage, type StateStorage } from "zustand/middleware";

const DB = "crest-book";
const STORE = "kv";

let persistPaused = false;
let pendingWrite: { name: string; value: string } | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let waiters: Array<() => void> = [];

export function pauseCrestPersist() {
  persistPaused = true;
}

export function resumeCrestPersist() {
  persistPaused = false;
  if (pendingWrite) {
    const next = pendingWrite;
    pendingWrite = null;
    void flushWrite(next);
  }
}

async function flushWrite(next: { name: string; value: string }) {
  try {
    await idbSet(next.name, next.value);
    try {
      localStorage.removeItem(next.name);
    } catch {
      /* ignore */
    }
    return;
  } catch {
    /* last resort */
  }
  try {
    localStorage.setItem(next.name, next.value);
  } catch {
    /* quota — book stays in memory */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

function reqOf<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  const value = await reqOf(db.transaction(STORE, "readonly").objectStore(STORE).get(key));
  return typeof value === "string" ? value : value == null ? null : String(value);
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  await reqOf(db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key));
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  await reqOf(db.transaction(STORE, "readwrite").objectStore(STORE).delete(key));
}

const rawStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const fromIdb = await idbGet(name);
      if (fromIdb != null) return fromIdb;
    } catch {
      /* fall through */
    }
    try {
      const legacy = localStorage.getItem(name);
      if (legacy) {
        try {
          await idbSet(name, legacy);
          localStorage.removeItem(name);
        } catch {
          /* keep reading from localStorage */
        }
        return legacy;
      }
    } catch {
      /* ignore */
    }
    return null;
  },
  setItem: (name, value) => {
    pendingWrite = { name, value };
    if (persistPaused) return Promise.resolve();
    return new Promise<void>((resolve) => {
      waiters.push(resolve);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const next = pendingWrite;
        pendingWrite = null;
        const done = waiters;
        waiters = [];
        const finish = () => done.forEach((fn) => fn());
        if (!next || persistPaused) {
          finish();
          return;
        }
        void flushWrite(next).then(finish, finish);
      }, 400);
    });
  },
  removeItem: async (name) => {
    try {
      await idbDel(name);
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const crestStorage = rawStorage;

export const crestPersistStorage = createJSONStorage(() => rawStorage);
