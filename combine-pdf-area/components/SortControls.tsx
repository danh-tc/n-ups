"use client";

import React, { useState } from "react";
import { usePdfStore } from "@/combine-pdf-area/hooks/usePdfStore";
import "@/combine-pdf-area/styles/rethink-sort-controls.scss";

export default function SortControls() {
  const { files, updateOrder } = usePdfStore();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = () => {
    if (files.length < 2) return; 
    const sorted = [...files].sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

    const updated = sorted.map((f, i) => ({ ...f, order: i + 1 }));
    updateOrder(updated);

    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const isDisabled = files.length < 2;

  return (
    <div className="rethink-sort-controls">
      <button
        className={`rethink-sort-controls__btn ${
          isDisabled ? "is-disabled" : ""
        }`}
        onClick={handleSort}
        disabled={isDisabled}
      >
        🔤 Sort by Name ({sortOrder === "asc" ? "A → Z" : "Z → A"})
      </button>
    </div>
  );
}
