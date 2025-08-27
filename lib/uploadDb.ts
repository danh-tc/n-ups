import { openDB } from "idb";

const DB_NAME = "nups-db";
const STORE = "uploads";

export async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    },
  });
}

export async function savePdf(fileId: string, file: File) {
  const db = await getDb();
  const buf = await file.arrayBuffer();
  await db.put(STORE, { name: file.name, buf }, fileId);
}

export async function loadPdf(fileId: string) {
  const db = await getDb();
  return (await db.get(STORE, fileId)) as
    | { name: string; buf: ArrayBuffer }
    | undefined;
}

export async function removePdf(fileId: string) {
  const db = await getDb();
  await db.delete(STORE, fileId);
}

export async function listPdfIds(): Promise<string[]> {
  const db = await getDb();
  return (await db.getAllKeys(STORE)) as string[];
}
