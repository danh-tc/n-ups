"use client";

import React, { useState } from "react";
import { usePdfStore } from "@/combine-pdf-area/hooks/usePdfStore";
import "@/combine-pdf-area/styles/rethink-action-bar.scss";
import CombineButton from "@/combine-pdf-area/components/CombineButton";

export default function ActionBar() {
  const { files, updateOrder, clearAll } = usePdfStore();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = async () => {
    if (files.length < 2) return;
    const sorted = [...files].sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    const updated = sorted.map((f, i) => ({ ...f, order: i + 1 }));
    await updateOrder(updated);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleClearAll = async () => {
    if (files.length === 0) return;
    if (confirm("Are you sure you want to clear all uploaded PDFs?")) {
      await clearAll();
    }
  };

  const isDisabled = files.length < 2;

  return (
    <div className="rethink-action-bar">
      <button
        className={`rethink-action-bar__btn ${isDisabled ? "is-disabled" : ""}`}
        onClick={handleSort}
        disabled={isDisabled}
      >
        Sort ({sortOrder === "asc" ? "A → Z" : "Z → A"})
      </button>

      <button
        className="rethink-action-bar__btn rethink-action-bar__btn--clear"
        onClick={handleClearAll}
        disabled={files.length === 0}
      >
        Clear All
      </button>

      <CombineButton />
    </div>
  );
}
