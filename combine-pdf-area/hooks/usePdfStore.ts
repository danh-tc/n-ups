"use client";

import { create } from "zustand";
import type { PdfFileRecord } from "@/combine-pdf-area/lib/db";
import {
  getAllFilesSorted,
  saveFile,
  saveManyFiles,
  deleteFileById,
  clearAllFiles,
} from "@/combine-pdf-area/lib/db";

interface PdfStoreState {
  files: PdfFileRecord[];
  isLoading: boolean;
  isInitialized: boolean;

  loadFromDb: () => Promise<void>;
  addFile: (record: PdfFileRecord) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  updateOrder: (updatedFiles: PdfFileRecord[]) => Promise<void>;
}

function normalizeOrder(files: PdfFileRecord[]): PdfFileRecord[] {
  return files
    .slice()
    .sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
    )
    .map((f, index) => ({
      ...f,
      order: index + 1,
    }));
}

export const usePdfStore = create<PdfStoreState>((set, get) => ({
  files: [],
  isLoading: false,
  isInitialized: false,

  /**
   * Load all records from IndexedDB on first app load.
   */
  loadFromDb: async () => {
    const { isInitialized } = get();
    if (isInitialized) return;

    set({ isLoading: true });

    try {
      const records = await getAllFilesSorted();
      const normalized = normalizeOrder(records);
      set({
        files: normalized,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error("Failed to load files from IndexedDB", error);
      set({
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  /**
   * Add a new file to the store and persist it.
   */
  addFile: async (record: PdfFileRecord) => {
    const current = get().files;

    // Ensure an order is assigned
    const nextOrder =
      typeof record.order === "number" && record.order > 0
        ? record.order
        : current.length + 1;

    const finalRecord: PdfFileRecord = {
      ...record,
      order: nextOrder,
    };

    const updated = normalizeOrder([...current, finalRecord]);
    set({ files: updated });

    try {
      // Save only this file; others' order should remain consistent
      await saveFile(finalRecord);
    } catch (error) {
      console.error("Failed to save file to IndexedDB", error);
    }
  },

  /**
   * Delete a file and re-normalize order of remaining items.
   */
  deleteFile: async (id: string) => {
    const remaining = get().files.filter((f) => f.id !== id);
    const normalized = normalizeOrder(remaining);
    set({ files: normalized });

    try {
      await deleteFileById(id);
      // Persist new order for remaining files
      await saveManyFiles(normalized);
    } catch (error) {
      console.error("Failed to delete file from IndexedDB", error);
    }
  },

  /**
   * Clear all files from state and IndexedDB.
   */
  clearAll: async () => {
    set({ files: [] });

    try {
      await clearAllFiles();
    } catch (error) {
      console.error("Failed to clear IndexedDB", error);
    }
  },

  /**
   * Update order after drag/drop or manual sort.
   * Expects updatedFiles to reflect the *visual* desired order.
   */
  updateOrder: async (updatedFiles: PdfFileRecord[]) => {
    const normalized = normalizeOrder(updatedFiles);
    set({ files: normalized });

    try {
      await saveManyFiles(normalized);
    } catch (error) {
      console.error("Failed to persist new order to IndexedDB", error);
    }
  },
}));
