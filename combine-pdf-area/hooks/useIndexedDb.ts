"use client";

import { useCallback } from "react";
import type { PdfFileRecord } from "@/combine-pdf-area/lib/db";
import {
  getAllFilesSorted,
  saveFile,
  saveManyFiles,
  deleteFileById,
  clearAllFiles,
} from "@/combine-pdf-area/lib/db";

export function useIndexedDb() {
  const loadFiles = useCallback(async (): Promise<PdfFileRecord[]> => {
    return await getAllFilesSorted();
  }, []);

  const addFile = useCallback(async (record: PdfFileRecord): Promise<void> => {
    await saveFile(record);
  }, []);

  const addMany = useCallback(
    async (records: PdfFileRecord[]): Promise<void> => {
      await saveManyFiles(records);
    },
    []
  );

  const removeFile = useCallback(async (id: string): Promise<void> => {
    await deleteFileById(id);
  }, []);

  const clearAll = useCallback(async (): Promise<void> => {
    await clearAllFiles();
  }, []);

  return {
    loadFiles,
    addFile,
    addMany,
    removeFile,
    clearAll,
  };
}
