"use client";

import "@/combine-pdf-area/styles/rethink-loading-overlay.scss";

export default function LoadingOverlay({
  message = "Loading…",
}: {
  message?: string;
}) {
  return (
    <div className="rethink-loading">
      <div className="rethink-loading__spinner"></div>
      <div className="rethink-loading__message">{message}</div>
    </div>
  );
}
