"use client";

import React, { useState } from "react";
import { usePdfStore } from "@/combine-pdf-area/hooks/usePdfStore";
import { combinePdfs } from "@/combine-pdf-area/lib/pdfUtils";
import "@/combine-pdf-area/styles/rethink-dialog.scss";
import LoadingOverlay from "./LoadingOverlay";

export default function CombineDialog({ onClose }: { onClose: () => void }) {
  const { files, clearAll } = usePdfStore();

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const autoName = `combined-pdf-${dd}${mm}${yyyy}`;

  const [mode, setMode] = useState<"auto" | "random" | "custom">("auto");
  const [filename, setFilename] = useState(autoName);
  const [isMerging, setIsMerging] = useState(false);

  const generateRandom = () => {
    const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${autoName}-${hash}`;
  };

  const handleConfirm = async () => {
    setIsMerging(true);

    let finalName = filename;
    if (mode === "auto") finalName = autoName;
    if (mode === "random") finalName = generateRandom();

    if (!finalName.endsWith(".pdf")) {
      finalName += ".pdf";
    }
    try {
      const mergedBlob = await combinePdfs(files);
      // Download
      const url = URL.createObjectURL(mergedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalName;
      a.click();

      // Cleanup
      await clearAll();
      onClose();
    } catch (error) {
      console.error("Failed to combine PDFs", error);
    }
  };

  return (
    <div className="rethink-dialog">
      <div className="rethink-dialog__box">
        <h3 className="rethink-dialog__title">Save Combined PDF</h3>

        <label className="rethink-dialog__label">Filename options</label>

        <div className="rethink-dialog__options">
          <label>
            <input
              type="radio"
              checked={mode === "auto"}
              onChange={() => setMode("auto")}
            />
            Auto name ({autoName})
          </label>

          <label>
            <input
              type="radio"
              checked={mode === "random"}
              onChange={() => setMode("random")}
            />
            Random name
          </label>

          <label>
            <input
              type="radio"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
            />
            Custom name
          </label>

          {mode === "custom" && (
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="rethink-dialog__input"
            />
          )}
        </div>

        <div className="rethink-dialog__actions">
          <button onClick={onClose} className="rethink-dialog__btn--cancel">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rethink-dialog__btn--confirm"
            disabled={isMerging}
          >
            {isMerging ? "Merging…" : "Combine"}
            {isMerging && <LoadingOverlay message="Merging PDFs…" />}
          </button>
        </div>
      </div>
    </div>
  );
}
