"use client";

import "./image-cell.scss";

interface Props {
  width: number; 
  height: number; 
  children?: React.ReactNode;
}

export const ImageCell: React.FC<Props> = ({ width, height, children }) => (
  <div
    className="image-cell"
    style={{
      width,
      height,
      position: "relative",
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);
