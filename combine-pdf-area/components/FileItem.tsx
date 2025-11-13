"use client";

import React from "react";
import type { PdfFileRecord } from "@/combine-pdf-area/lib/db";
import ProgressBar from "./ProgressBar";
import "@/combine-pdf-area/styles/rethink-file-item.scss";

interface Props {
  file: PdfFileRecord;
  onDelete: (id: string) => Promise<void>;
}

// Auto-switch KB / MB / GB
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export default function FileItem({ file, onDelete }: Props) {
  return (
    <li className="rethink-file-item">
      <div className="rethink-file-item__info">
        <span className="rethink-file-item__name">{file.name}</span>

        {/* Auto-size here */}
        <span className="rethink-file-item__size">{formatSize(file.size)}</span>

        <ProgressBar value={100} />
        <span className="rethink-file-item__status">✅ Complete</span>
      </div>

      <button
        className="rethink-file-item__delete"
        onClick={() => onDelete(file.id)}
      >
        ❌
      </button>
    </li>
  );
}
