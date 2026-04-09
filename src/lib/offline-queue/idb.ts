"use client";

type QueueItem = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
};

const DB_NAME = "sunshinecabs";
const DB_VERSION = 1;
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      })
  );
}

export async function enqueue(type: QueueItem["type"], payload: QueueItem["payload"]) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(16).slice(2);

  const item: QueueItem = { id, type, payload, createdAt: Date.now() };
  await tx("readwrite", (s) => s.put(item));
  return item;
}

export async function listQueue(): Promise<QueueItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const store = t.objectStore(STORE);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as QueueItem[]).sort((a, b) => a.createdAt - b.createdAt));
  });
}

export async function removeFromQueue(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}

