import { getTodayString } from "@/lib/utils";
import { ImageConfig, PaperConfig } from "@/types/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MetaInfo = {
  customerName: string;
  date: string;
  description: string;
};

interface ImpositionState {
  paper: PaperConfig;
  setPaper: (paper: PaperConfig) => void;
  image: ImageConfig;
  setImage: (image: ImageConfig) => void;
  meta: MetaInfo;
  setMeta: (meta: MetaInfo) => void;
  displayMeta?: boolean; // Optional field for controlling meta display
  setDisplayMeta: (displayMeta: boolean) => void;
}

const defaultImage: ImageConfig = {
  width: 57,
  height: 92,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
};

const defaultPaper: PaperConfig = {
  width: 297,
  height: 210,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  gap: { horizontal: 0, vertical: 0 },
};

export const useImpositionStore = create<ImpositionState>()(
  persist(
    (set) => ({
      paper: defaultPaper,
      setPaper: (paper) => set({ paper }),
      image: defaultImage,
      setImage: (image) => set({ image }),
      meta: { customerName: "", date: getTodayString(), description: "" },
      setMeta: (meta) => set({ meta }),
      setDisplayMeta: (displayMeta) => set({ displayMeta: displayMeta }),
      displayMeta: true, // Default value for displayMeta
    }),
    {
      name: "imposition-storage", // localStorage key
      // Optionally, you can control which fields to persist
    }
  )
);
