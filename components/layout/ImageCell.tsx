"use client";

import "./image-cell.scss";

interface Props {
  width: number; 
  height: number; 
  children?: React.ReactNode;
  noMargins?: boolean
}

export const ImageCell: React.FC<Props> = ({ width, height, noMargins, children }) => (
  <div
    className="image-cell"
    style={{
      width,
      height,
      position: "relative",
      boxSizing: "border-box",
      outline: noMargins ? "1px solid blue" : undefined,
    }}
  >
    {children}
  </div>
);
