"use client";

import React from "react";
import "@/combine-pdf-area/styles/rethink-empty-state.scss";

export default function EmptyState() {
  return (
    <div className="rethink-empty-state">
      <div className="rethink-empty-state__icon">🏳️‍🌈</div>
      <h3 className="rethink-empty-state__title">No PDFs yet</h3>
      <p className="rethink-empty-state__desc">
        Upload your first file to start organizing your PDFs beautifully 💕
      </p>
    </div>
  );
}
