import { ImageConfig, PaperConfig } from "@/types/types";


export interface GridLayout {
  rows: number;
  cols: number;
  totalSlots: number;
}

export function calculateGridLayout(
  paper: PaperConfig,
  image: ImageConfig
): GridLayout {
  const usableWidth = paper.width - paper.margin.left - paper.margin.right;
  const usableHeight = paper.height - paper.margin.top - paper.margin.bottom;

  const cols = Math.floor(
    (usableWidth + paper.gap.horizontal) / (image.width + paper.gap.horizontal)
  );
  const rows = Math.floor(
    (usableHeight + paper.gap.vertical) / (image.height + paper.gap.vertical)
  );

  return {
    rows,
    cols,
    totalSlots: rows * cols,
  };
}
