"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./sheet-paginator.scss";

interface SheetPaginatorProps {
  totalSheets: number;
  currentSheet: number; // zero-based
  onChange: (index: number) => void;
}

export const SheetPaginator: React.FC<SheetPaginatorProps> = ({
  totalSheets,
  currentSheet,
  onChange,
}) => {
  if (totalSheets <= 1) return null;

  const goPrev = () => onChange(Math.max(0, currentSheet - 1));
  const goNext = () => onChange(Math.min(totalSheets - 1, currentSheet + 1));
  const goFirst = () => onChange(0);
  const goLast = () => onChange(totalSheets - 1);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    } else if (e.key === "Home") {
      e.preventDefault();
      goFirst();
    } else if (e.key === "End") {
      e.preventDefault();
      goLast();
    }
  };

  return (
    <div
      className="rethink-paginator"
      role="navigation"
      aria-label="Sheet navigation"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="rethink-paginator__btn rethink-paginator__btn--prev"
        onClick={goPrev}
        disabled={currentSheet === 0}
        aria-label="Previous sheet"
      >
        <ChevronLeft className="rethink-paginator__icon" />
      </button>

      <span className="rethink-paginator__label" aria-live="polite">
        Sheet {currentSheet + 1} of {totalSheets}
      </span>

      <button
        type="button"
        className="rethink-paginator__btn rethink-paginator__btn--next"
        onClick={goNext}
        disabled={currentSheet === totalSheets - 1}
        aria-label="Next sheet"
      >
        <ChevronRight className="rethink-paginator__icon" />
      </button>
    </div>
  );
};
