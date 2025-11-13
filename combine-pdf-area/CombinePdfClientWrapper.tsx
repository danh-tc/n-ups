"use client";

import { useEffect } from "react";

import UploadArea from "./components/UploadArea";
import FileList from "./components/FileList";

import { usePdfStore } from "./hooks/usePdfStore";
import SortControls from "./components/SortControls";
import "@/combine-pdf-area/styles/rethink-theme.scss";
import ActionBar from "./components/ActionBar";
import EmptyState from "./components/EmptyState";

export default function CombinePdfClientWrapper() {
  const { files, loadFromDb, deleteFile } = usePdfStore();

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  return (
    <main className="rethink-combine">
      <UploadArea />
      <ActionBar />
      {files.length > 0 ? (
        <FileList files={files} onDelete={deleteFile} />
      ) : (
        <EmptyState />
      )}
    </main>
  );
}
