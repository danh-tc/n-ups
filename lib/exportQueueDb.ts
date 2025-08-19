import { createStore, get, set, del, keys } from "idb-keyval";

export interface QueueMeta {
  id: string;
  name: string;
  pageCount: number;
  createdAt: number;
  order: number;
}

const metaStore = createStore("imposition-db-meta", "queue-meta");
const blobStore = createStore("imposition-db-blobs", "queue-blobs");
export const exportQueueDb = {
  async ensurePersistence(): Promise<boolean> {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch {}
    return false;
  },

  async put(meta: QueueMeta, blob: Blob): Promise<void> {
    await set(meta.id, meta, metaStore);
    await set(meta.id, blob, blobStore);
  },

  async updateMeta(meta: QueueMeta): Promise<void> {
    await set(meta.id, meta, metaStore);
  },

  async listMeta(): Promise<QueueMeta[]> {
    const allKeys = await keys(metaStore);
    const metas = await Promise.all(
      allKeys.map((k) => get<QueueMeta>(k as IDBValidKey, metaStore))
    );
    return metas.filter(Boolean) as QueueMeta[];
  },

  async getBlob(id: string): Promise<Blob | undefined> {
    return (await get(id, blobStore)) as Blob | undefined;
  },

  async delete(id: string): Promise<void> {
    await del(id, metaStore);
    await del(id, blobStore);
  },

  async clear(): Promise<void> {
    const allKeys = await keys(metaStore);
    await Promise.all(allKeys.map((k) => del(k as IDBValidKey, metaStore)));
    const blobKeys = await keys(blobStore);
    await Promise.all(blobKeys.map((k) => del(k as IDBValidKey, blobStore)));
  },
};
