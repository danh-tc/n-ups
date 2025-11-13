import { openDB, IDBPDatabase } from "idb";

export interface PdfFileRecord {
  id: string;
  name: string;
  size: number;
  file: Blob;
  uploadedAt: string;
  order: number;
}

const DB_NAME = "combinePdfDb";
const DB_VERSION = 1;
const STORE_NAME = "pdfFiles";

type PdfDb = IDBPDatabase<unknown>;

let dbPromise: Promise<PdfDb> | null = null;

export function getDb(): Promise<PdfDb> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Get all files sorted by `order` ascending.
 */
export async function getAllFilesSorted(): Promise<PdfFileRecord[]> {
  const db = await getDb();
  const files = (await db.getAll(STORE_NAME)) as PdfFileRecord[];
  return files
    .slice()
    .sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
    );
}

/**
 * Save or update a single file record.
 */
export async function saveFile(record: PdfFileRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, record);
}

/**
 * Save or update many file records in a single transaction.
 */
export async function saveManyFiles(records: PdfFileRecord[]): Promise<void> {
  if (!records.length) return;
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  for (const record of records) {
    await store.put(record);
  }

  await tx.done;
}

/**
 * Delete a single record by id.
 */
export async function deleteFileById(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

/**
 * Clear all records.
 */
export async function clearAllFiles(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
