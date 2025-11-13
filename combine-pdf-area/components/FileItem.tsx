"use client";

import React from "react";
import type { PdfFileRecord } from "@/combine-pdf-area/lib/db";
import ProgressBar from "./ProgressBar";
import "@/combine-pdf-area/styles/rethink-file-item.scss";

interface Props {
  file: PdfFileRecord;
  onDelete: (id: string) => Promise<void>;
}

export default function FileItem({ file, onDelete }: Props) {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

  return (
    <li className="rethink-file-item">
      <div className="rethink-file-item__info">
        <span className="rethink-file-item__name">{file.name}</span>
        <span className="rethink-file-item__size">{sizeMB} MB</span>
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
