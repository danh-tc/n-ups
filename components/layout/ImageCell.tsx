"use client";

import "./image-cell.scss";

interface Props {
  width: number; // px
  height: number; // px
  children?: React.ReactNode;
}

export const ImageCell: React.FC<Props> = ({ width, height, children }) => (
  <div
    className="image-cell"
    style={{
      width,
      height,
      position: "relative",
      // visual outer frame (slot)
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);
