"use client";

import React, { useRef, useState, DragEvent } from "react";
import { usePdfStore } from "@/combine-pdf-area/hooks/usePdfStore";
import type { PdfFileRecord } from "@/combine-pdf-area/lib/db";
import "@/combine-pdf-area/styles/rethink-upload-area.scss";

export default function UploadArea() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addFile, files } = usePdfStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const pdfs = Array.from(fileList).filter(
      (f) => f.type === "application/pdf"
    );

    pdfs.forEach(async (file, i) => {
      const id = `${Date.now()}-${i}`;
      const order = files.length + i + 1;
      const record: PdfFileRecord = {
        id,
        name: file.name,
        size: file.size,
        file,
        uploadedAt: new Date().toISOString(),
        order,
      };

      const reader = new FileReader();
      reader.onloadend = async () => await addFile(record);
      reader.readAsArrayBuffer(file);
    });
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`rethink-upload-area ${isDragging ? "is-dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="rethink-upload-area__input"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="rethink-upload-area__text">
        Drag & Drop or{" "}
        <span className="rethink-upload-area__highlight">click</span> to upload
        PDFs
      </p>
    </div>
  );
}
