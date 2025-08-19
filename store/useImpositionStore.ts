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

  displayMeta?: boolean;
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
  duplex: false,
  cutMarkLengthMm: 5,
};

export const useImpositionStore = create<ImpositionState>()(
  persist(
    (set) => ({
      paper: defaultPaper,
      setPaper: (paper) => {
        const merged: PaperConfig = {
          ...defaultPaper,
          ...paper,
          margin: { ...defaultPaper.margin, ...(paper.margin ?? {}) },
          gap: { ...defaultPaper.gap, ...(paper.gap ?? {}) },
          duplex:
            paper.duplex !== undefined ? paper.duplex : defaultPaper.duplex,
          cutMarkLengthMm:
            paper.cutMarkLengthMm !== undefined
              ? paper.cutMarkLengthMm
              : defaultPaper.cutMarkLengthMm,
        };
        set({ paper: merged });
      },

      image: defaultImage,
      setImage: (image) => set({ image }),

      meta: { customerName: "", date: getTodayString(), description: "" },
      setMeta: (meta) => set({ meta }),

      displayMeta: true,
      setDisplayMeta: (displayMeta) => set({ displayMeta }),
    }),
    {
      name: "imposition-storage",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState;
        }

        const state = persistedState as {
          paper?: Partial<PaperConfig>;
          image?: ImageConfig;
          meta?: MetaInfo;
          displayMeta?: boolean;
        };

        if (version < 2) {
          const paper = state.paper ?? {};
          state.paper = {
            ...defaultPaper,
            ...paper,
            margin: { ...defaultPaper.margin, ...(paper.margin ?? {}) },
            gap: { ...defaultPaper.gap, ...(paper.gap ?? {}) },
            duplex: paper.duplex ?? defaultPaper.duplex,
            cutMarkLengthMm:
              paper.cutMarkLengthMm ?? defaultPaper.cutMarkLengthMm,
          };
        }

        return state;
      },
    }
  )
);
