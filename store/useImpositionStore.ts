import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PaperConfig,
  ImageConfig,
  MetaInfo,
  UploadedImage,
} from "@/types/types";

type Slot = UploadedImage | undefined;

interface ImpositionState {
  // Core config
  paper: PaperConfig;
  setPaper: (paper: PaperConfig) => void;

  image: ImageConfig;
  setImage: (image: ImageConfig) => void;

  meta: MetaInfo;
  setMeta: (meta: MetaInfo) => void;

  displayMeta: boolean;
  setDisplayMeta: (display: boolean) => void;

  // Slots (persisted)
  frontSlots: Slot[];
  backSlots: Slot[];

  setFrontSlots: (slots: Slot[]) => void;
  setBackSlots: (slots: Slot[]) => void;

  ensureCapacity: (slotsPerSheet: number) => void;
  clearFront: () => void;
  clearBack: () => void;
  clearBoth: () => void;
  clearByFileId: (fileId: string) => void;

  rotateFrontBy: (deg: number) => void; // sheet-wide rotation
  rotateBackBy: (deg: number) => void; // sheet-wide rotation

  /* ===== Newly added ===== */
  frontSelection: { fileId: string; pageNumber: number } | null;
  backSelection: { fileId: string; pageNumber: number } | null;
  setFrontSelection: (
    sel: { fileId: string; pageNumber: number } | null
  ) => void;
  setBackSelection: (
    sel: { fileId: string; pageNumber: number } | null
  ) => void;
}

// Defaults
const defaultPaper: PaperConfig = {
  width: 210,
  height: 297,
  duplex: false,
  margin: { top: 5, right: 5, bottom: 5, left: 5 },
  gap: { horizontal: 0, vertical: 0 },
  cutMarkLengthMm: 6,
};

const defaultImage: ImageConfig = {
  width: 57,
  height: 92,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
};

const defaultMeta: MetaInfo = {
  customerName: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
};

const normDeg = (d: number): number => ((d % 360) + 360) % 360;

const padTo = (arr: Slot[], n: number): Slot[] => {
  if (n <= 0) return [];
  if (arr.length === n) return arr;
  if (arr.length > n) return arr.slice(0, n);
  return [...arr, ...Array<Slot>(n - arr.length).fill(undefined)];
};

export const useImpositionStore = create<ImpositionState>()(
  persist(
    (set, get) => ({
      // Core
      paper: defaultPaper,
      setPaper: (paper) => set({ paper }),

      image: defaultImage,
      setImage: (image) => set({ image }),

      meta: defaultMeta,
      setMeta: (meta) => set({ meta }),

      displayMeta: true,
      setDisplayMeta: (display) => set({ displayMeta: display }),

      // Slots
      frontSlots: [],
      backSlots: [],

      setFrontSlots: (slots) => set({ frontSlots: slots }),
      setBackSlots: (slots) => set({ backSlots: slots }),

      ensureCapacity: (slotsPerSheet) =>
        set((s) => ({
          frontSlots: padTo(s.frontSlots, slotsPerSheet),
          backSlots: padTo(s.backSlots, slotsPerSheet),
        })),

      clearFront: () =>
        set((s) => ({
          frontSlots: Array<Slot>(s.frontSlots.length).fill(undefined),
        })),

      clearBack: () =>
        set((s) => ({
          backSlots: Array<Slot>(s.backSlots.length).fill(undefined),
        })),

      clearBoth: () =>
        set((s) => ({
          frontSlots: Array<Slot>(s.frontSlots.length).fill(undefined),
          backSlots: Array<Slot>(s.backSlots.length).fill(undefined),
        })),

      clearByFileId: (fileId) =>
        set((s) => ({
          frontSlots: s.frontSlots.map((it) =>
            it?.sourceFileId === fileId ? undefined : it
          ),
          backSlots: s.backSlots.map((it) =>
            it?.sourceFileId === fileId ? undefined : it
          ),
        })),

      rotateFrontBy: (deg) =>
        set((s) => ({
          frontSlots: s.frontSlots.map((it) =>
            it
              ? { ...it, rotationDeg: normDeg((it.rotationDeg ?? 0) + deg) }
              : it
          ),
        })),

      rotateBackBy: (deg) =>
        set((s) => ({
          backSlots: s.backSlots.map((it) =>
            it
              ? { ...it, rotationDeg: normDeg((it.rotationDeg ?? 0) + deg) }
              : it
          ),
        })),

      /* ===== New fields + setters ===== */
      frontSelection: null,
      backSelection: null,
      setFrontSelection: (sel) => set({ frontSelection: sel }),
      setBackSelection: (sel) => set({ backSelection: sel }),
    }),
    {
      name: "imposition-store-v2",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
