"use client";

import React from "react";
import "@/combine-pdf-area/styles/rethink-progress-bar.scss";

interface Props {
  value: number;
}

export default function ProgressBar({ value }: Props) {
  return (
    <div className="rethink-progress-bar">
      <div
        className="rethink-progress-bar__fill"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
}
