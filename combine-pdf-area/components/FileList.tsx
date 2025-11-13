"use client";

import React, { useEffect, useRef } from "react";
import Sortable from "sortablejs";
import FileItem from "./FileItem";
import type { PdfFileRecord } from "@/combine-pdf-area/lib/db";
import { usePdfStore } from "@/combine-pdf-area/hooks/usePdfStore";
import "@/combine-pdf-area/styles/rethink-file-list.scss";

interface Props {
  files: PdfFileRecord[];
  onDelete: (id: string) => Promise<void>;
}

export default function FileList({ files, onDelete }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const { updateOrder } = usePdfStore();

  useEffect(() => {
    if (!listRef.current) return;
    const sortable = Sortable.create(listRef.current, {
      animation: 150,
      onEnd: (evt) => {
        const reordered = [...files];
        const [moved] = reordered.splice(evt.oldIndex!, 1);
        reordered.splice(evt.newIndex!, 0, moved);
        const updated = reordered.map((f, i) => ({ ...f, order: i + 1 }));
        updateOrder(updated);
      },
    });
    return () => sortable.destroy();
  }, [files, updateOrder]);

  return (
    <div className="rethink-file-list-wrapper">
      <div className="rethink-file-list__header">
        📄 Loaded files: <strong>{files.length}</strong>
      </div>

      <ul className="rethink-file-list" ref={listRef}>
        {files.map((file, index) => (
          <FileItem key={file.id} file={file} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
