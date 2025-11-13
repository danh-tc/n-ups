"use client";

import React, { useState } from "react";
import { usePdfStore } from "@/combine-pdf-area/hooks/usePdfStore";
import CombineDialog from "@/combine-pdf-area/components/CombineDialog";
import "@/combine-pdf-area/styles/rethink-combine-btn.scss";

export default function CombineButton() {
  const { files } = usePdfStore();
  const [open, setOpen] = useState(false);

  if (files.length < 2) return null;

  return (
    <>
      <button className="rethink-combine-btn" onClick={() => setOpen(true)}>
        📑 Combine PDFs
      </button>

      {open && <CombineDialog onClose={() => setOpen(false)} />}
    </>
  );
}
