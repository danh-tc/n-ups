// src/store/useExportQueueStore.ts
import { create } from "zustand";
import { exportQueueDb, QueueMeta } from "@/lib/exportQueueDb";

type State = {
  items: QueueMeta[]; // metadata only (ordered)
  hydrated: boolean;
};

type Actions = {
  hydrate: () => Promise<void>;
  add: (name: string, pageCount: number, blob: Blob) => Promise<QueueMeta>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  move: (id: string, dir: "up" | "down") => Promise<void>;
  exportAll: () => Promise<Uint8Array | null>;
};

const generateId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const useExportQueueStore = create<State & Actions>((set, get) => ({
  items: [],
  hydrated: false,

  async hydrate(): Promise<void> {
    await exportQueueDb.ensurePersistence();
    const metas = await exportQueueDb.listMeta();
    const sorted = [...metas].sort(
      (a, b) => a.order - b.order || a.createdAt - b.createdAt
    );
    set({ items: sorted, hydrated: true });
  },

  async add(name: string, pageCount: number, blob: Blob): Promise<QueueMeta> {
    const current = get().items;
    const id = generateId();
    const createdAt = Date.now();
    const order = current.length; // append to bottom
    const meta: QueueMeta = {
      id,
      name: name.trim() || `Job ${order + 1}`,
      pageCount,
      createdAt,
      order,
    };

    await exportQueueDb.put(meta, blob);
    set({ items: [...current, meta] });
    return meta;
  },

  async remove(id: string): Promise<void> {
    const kept = get().items.filter((i) => i.id !== id);
    const reindexed = kept.map((m, idx) => ({ ...m, order: idx }));
    // Persist new orders first, then delete the removed record
    await Promise.all(reindexed.map((m) => exportQueueDb.updateMeta(m)));
    await exportQueueDb.delete(id);
    set({ items: reindexed });
  },

  async clear(): Promise<void> {
    await exportQueueDb.clear();
    set({ items: [] });
  },

  async move(id: string, dir: "up" | "down"): Promise<void> {
    const items = [...get().items];
    const from = items.findIndex((i) => i.id === id);
    if (from === -1) return;

    const to = dir === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= items.length) return;

    [items[from], items[to]] = [items[to], items[from]];
    const reindexed = items.map((m, idx) => ({ ...m, order: idx }));
    await Promise.all(reindexed.map((m) => exportQueueDb.updateMeta(m)));
    set({ items: reindexed });
  },

  async exportAll(): Promise<Uint8Array | null> {
    const items = get().items;
    if (!items.length) return null;

    const { PDFDocument } = await import("pdf-lib");
    const out = await PDFDocument.create();

    for (const meta of items) {
      const blob = await exportQueueDb.getBlob(meta.id);
      if (!blob) continue; // skip missing/corrupt blobs
      const buf = await blob.arrayBuffer();
      const src = await PDFDocument.load(buf);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }

    const mergedBytes = await out.save();
    return mergedBytes;
  },
}));
