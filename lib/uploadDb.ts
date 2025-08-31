import { openDB, type IDBPDatabase } from "idb";

/** ================= IndexedDB names ================= */
const DB_NAME = "nups-db";
const UPLOADS_STORE = "uploads";
const PREVIEWS_STORE = "previews"; // compound key: [fileId, pageNumber]

/** ================= Types ================= */
type PreviewRecord = {
  fileId: string;
  pageNumber: number; // 1-based
  width: number;
  height: number;
  dataUrl: string; // PNG dataURL
  rotationDeg?: number; // 0|90|180|270
};

export type PreviewPage = {
  pageNumber: number; // 1-based
  width: number;
  height: number;
  dataUrl: string;
  rotationDeg?: number;
};

/** ================= DB bootstrap ================= */
async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      // v1: uploads store
      if (!db.objectStoreNames.contains(UPLOADS_STORE)) {
        db.createObjectStore(UPLOADS_STORE);
      }

      // v2: previews store with compound key + index
      if (!db.objectStoreNames.contains(PREVIEWS_STORE)) {
        const s = db.createObjectStore(PREVIEWS_STORE, {
          keyPath: ["fileId", "pageNumber"],
        });
        s.createIndex("by_file", "fileId", { unique: false });
      }
      // NOTE: If PREVIEWS_STORE already exists (coming from >= v2),
      // we don't touch it here—no transactions inside upgrade.
    },
  });
}

/** ================== Uploads (PDF blobs) ================== */
export async function savePdf(fileId: string, file: File): Promise<void> {
  const db = await getDb();
  const buf = await file.arrayBuffer();
  await db.put(UPLOADS_STORE, { name: file.name, buf }, fileId);
}

export async function loadPdf(
  fileId: string
): Promise<{ name: string; buf: ArrayBuffer } | undefined> {
  const db = await getDb();
  return (await db.get(UPLOADS_STORE, fileId)) as
    | { name: string; buf: ArrayBuffer }
    | undefined;
}

export async function removePdf(fileId: string): Promise<void> {
  const db = await getDb();
  await db.delete(UPLOADS_STORE, fileId);
}

export async function listPdfIds(): Promise<string[]> {
  const db = await getDb();
  return (await db.getAllKeys(UPLOADS_STORE)) as string[];
}

/** ================== Previews (page thumbnails) ==================
 * Persist one record per (fileId, pageNumber). Used to hydrate on reload and keep user rotations.
 */
export async function upsertPreviews(
  fileId: string,
  pages: PreviewPage[]
): Promise<void> {
  if (pages.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(PREVIEWS_STORE, "readwrite");
  const store = tx.objectStore(PREVIEWS_STORE);
  for (const p of pages) {
    const rot = p.rotationDeg ?? 0;
    const rotationDeg = ((rot % 360) + 360) % 360;
    await store.put({
      fileId,
      pageNumber: p.pageNumber,
      width: p.width,
      height: p.height,
      dataUrl: p.dataUrl,
      rotationDeg,
    } as PreviewRecord);
  }
  await tx.done;
}

export async function loadPreviews(fileId: string): Promise<PreviewPage[]> {
  const db = await getDb();
  const tx = db.transaction(PREVIEWS_STORE, "readonly");
  const store = tx.objectStore(PREVIEWS_STORE);
  const idx = store.index("by_file");
  const recs = (await idx.getAll(fileId)) as PreviewRecord[];
  await tx.done;

  recs.sort((a, b) => a.pageNumber - b.pageNumber);
  return recs.map((r) => ({
    pageNumber: r.pageNumber,
    width: r.width,
    height: r.height,
    dataUrl: r.dataUrl,
    rotationDeg: r.rotationDeg ?? 0,
  }));
}

export async function removePreviews(fileId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PREVIEWS_STORE, "readwrite");
  const store = tx.objectStore(PREVIEWS_STORE);
  const idx = store.index("by_file");
  const keys = (await idx.getAllKeys(fileId)) as Array<[string, number]>;
  for (const key of keys) {
    await store.delete(key);
  }
  await tx.done;
}
