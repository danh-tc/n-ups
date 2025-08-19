export interface SlotImage {
  src: string;
  name: string;
  file?: File;
  crop?: CropSettings;
}

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface PaperConfig {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  gap: {
    horizontal: number;
    vertical: number;
  };
}

export type ImageMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export interface ImageConfig {
  width: number;   // mm
  height: number;  // mm
  margin: ImageMargin; // per-image inner whitespace (mm)
}

export interface LayoutConfig {
  rows: number;
  cols: number;
}

export interface MetaInfo {
  customerName?: string;
  description?: string;
  date?: string;
}

export interface UploadedImage {
  originalSrc: string;
  src: string;
  name: string;
  file?: File;
  crop?: CropSettings;
}
