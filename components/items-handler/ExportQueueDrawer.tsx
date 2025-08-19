// components/items-handler/ExportQueueDrawer.tsx
"use client";

import React, { useEffect, useRef } from "react";
import "./export-queue-drawer.scss";

export type ExportQueueViewItem = {
  id: string;
  name: string;
  pageCount: number;
  createdAt: number;
};

type Props = {
  open: boolean;
  items: ExportQueueViewItem[];
  onClose: () => void;
  onExportAll: () => void;
  onClear: () => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onRemove: (id: string) => void;
};

const fmt = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ExportQueueDrawer({
  open,
  items,
  onClose,
  onExportAll,
  onClear,
  onMove,
  onRemove,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="rethink-queue-drawer__overlay"
      ref={overlayRef}
      onMouseDown={(e) => {
        // Only close if the click started on the overlay backdrop
        if (e.target === overlayRef.current) onClose();
      }}
      aria-hidden={false}
    >
      <aside
        className="rethink-queue-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Export List"
      >
        <div className="rethink-queue-drawer__header">
          <div className="rethink-queue-drawer__title">
            Export List{" "}
            <span className="rethink-queue-drawer__count">
              ({items.length})
            </span>
          </div>
          <div className="rethink-queue-drawer__actions">
            <button
              className="rethink-btn rethink-btn--outline rethink-btn--sm"
              onClick={onClear}
              disabled={!items.length}
            >
              Clear
            </button>
            <button
              className="rethink-btn rethink-btn--primary rethink-btn--sm"
              onClick={onExportAll}
              disabled={!items.length}
            >
              Export All
            </button>
            <button
              className="rethink-btn rethink-btn--link"
              onClick={onClose}
              aria-label="Close queue"
            >
              ✕
            </button>
          </div>
        </div>

        <ul className="rethink-queue-list">
          {items.map((item, idx) => (
            <li className="rethink-queue-item" key={item.id}>
              <div className="rethink-queue-item__handle" aria-hidden>
                ≡
              </div>
              <div className="rethink-queue-item__meta">
                <div className="rethink-queue-item__title">
                  {item.name || `Job ${idx + 1}`}
                </div>
                <div className="rethink-queue-item__sub">
                  {item.pageCount} page{item.pageCount > 1 ? "s" : ""} ·{" "}
                  {fmt(item.createdAt)}
                </div>
              </div>
              <div className="rethink-queue-item__actions">
                <button
                  className="rethink-btn rethink-btn--outline rethink-btn--sm"
                  onClick={() => onMove(item.id, "up")}
                  disabled={idx === 0}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="rethink-btn rethink-btn--outline rethink-btn--sm"
                  onClick={() => onMove(item.id, "down")}
                  disabled={idx === items.length - 1}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  className="rethink-btn rethink-btn--outline rethink-btn--sm"
                  onClick={() => onRemove(item.id)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
          {!items.length && (
            <li className="rethink-queue-item rethink-queue-item--empty">
              No items yet. Use “Add to Export List”.
            </li>
          )}
        </ul>

        <div className="rethink-queue-drawer__footer">
          <div className="rethink-queue-drawer__hint">
            Tip: Items are merged top → bottom.
          </div>
        </div>
      </aside>
    </div>
  );
}
