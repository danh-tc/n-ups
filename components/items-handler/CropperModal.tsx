// components/items-handler/CropperModal.tsx
"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import "./cropper-modal.scss";

import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Undo2,
  X,
  Check,
  Minimize2,
  Maximize2,
  Crosshair,
} from "lucide-react";
import { CropSettings, ImageConfig } from "@/types/types";

interface CropperModalProps {
  imageData: ImageConfig;
  isOpen: boolean;
  imageSrc: string;
  dpi?: number;
  onClose: () => void;
  onConfirm: (result: { dataUrl: string; crop: CropSettings }) => void;
}

const MM_PER_INCH = 25.4;
const DPI_DEFAULT = 300;

export const CropperModal: React.FC<CropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
  imageData,
  dpi = DPI_DEFAULT,
}) => {
  const cropperRef = useRef<ReactCropperElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const { innerWmm, innerHmm, aspectRatio, targetPxW, targetPxH } =
    useMemo(() => {
      const m = imageData.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
      const w = Math.max(0.1, imageData.width - (m.left + m.right));
      const h = Math.max(0.1, imageData.height - (m.top + m.bottom));
      const ratio = w / h;
      const pxW = Math.max(1, Math.round((w / MM_PER_INCH) * dpi));
      const pxH = Math.max(1, Math.round((h / MM_PER_INCH) * dpi));
      return {
        innerWmm: w,
        innerHmm: h,
        aspectRatio: ratio,
        targetPxW: pxW,
        targetPxH: pxH,
      };
    }, [imageData, dpi]);

  useEffect(() => {
    if (isOpen) setLoaded(false);
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Optional: body scroll lock while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const cropper = () => cropperRef.current?.cropper;

  const centerCanvas = () => {
    const c = cropper();
    if (!c) return;
    const cb = c.getCropBoxData();
    const cd = c.getCanvasData();
    const left = Math.round(cb.left + (cb.width - cd.width) / 2);
    const top = Math.round(cb.top + (cb.height - cd.height) / 2);
    c.setCanvasData({ ...cd, left, top });
  };

  const zoomIn = () => cropper()?.zoom(0.1);
  const zoomOut = () => cropper()?.zoom(-0.1);
  const rotateLeft = () => cropper()?.rotate(-90);
  const rotateRight = () => cropper()?.rotate(90);

  const reset = () => {
    const c = cropper();
    if (!c) return;
    c.reset();
    c.clear();
    c.crop();
    requestAnimationFrame(() => {
      fillInset(); // re-apply default fill
    });
  };

  // Fit/Fill helpers
  const getContainCoverRatios = () => {
    const c = cropper();
    if (!c) return { contain: 1, cover: 1 };
    const cb = c.getCropBoxData();
    const id = c.getImageData();
    const rot = Math.abs((c.getData().rotate || 0) % 180) === 90;
    const nW = rot ? id.naturalHeight : id.naturalWidth;
    const nH = rot ? id.naturalWidth : id.naturalHeight;
    const contain = Math.min(cb.width / nW, cb.height / nH);
    const cover = Math.max(cb.width / nW, cb.height / nH);
    return { contain, cover };
  };

  const fitInset = () => {
    const c = cropper();
    if (!c) return;
    const cb = c.getCropBoxData();
    const { contain } = getContainCoverRatios();
    c.zoomTo(contain, { x: cb.left + cb.width / 2, y: cb.top + cb.height / 2 });
    requestAnimationFrame(centerCanvas);
  };

  const fillInset = () => {
    const c = cropper();
    if (!c) return;
    const cb = c.getCropBoxData();
    const { cover } = getContainCoverRatios();
    c.zoomTo(cover, { x: cb.left + cb.width / 2, y: cb.top + cb.height / 2 });
    requestAnimationFrame(centerCanvas);
  };

  const centerImage = () => centerCanvas();

  const handleReady = () => {
    setLoaded(true);
    requestAnimationFrame(() => {
      fillInset(); // default to "cover" and center
    });
  };

  const handleConfirm = () => {
    const c = cropper();
    if (!c) return;
    const canvas = c.getCroppedCanvas({
      width: targetPxW,
      height: targetPxH,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      fillColor: "#ffffff",
    });
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const data = c.getData();
    const imgData = c.getImageData();

    const crop: CropSettings = {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      rotate: data.rotate,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      naturalWidth: imgData.naturalWidth,
      naturalHeight: imgData.naturalHeight,
    };

    onConfirm({ dataUrl, crop });
  };

  if (!isOpen) return null;

  return (
    <div
      className="rethink-cropper__overlay"
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="rethink-cropper__modal" ref={modalRef}>
        <div className="rethink-cropper__header">
          <button
            className="rethink-cropper__btn rethink-cropper__btn--ghost"
            onClick={onClose}
          >
            <X size={20} />
            <span>Cancel</span>
          </button>

          <div className="rethink-cropper__title">
            Inner area (W/H): {innerWmm.toFixed(1)}mm / {innerHmm.toFixed(1)}mm
            · DPI {dpi}
          </div>

          <button
            className="rethink-cropper__btn rethink-cropper__btn--confirm"
            onClick={handleConfirm}
            disabled={!loaded}
          >
            <Check size={20} />
            <span>Confirm</span>
          </button>
        </div>

        <div className="rethink-cropper__body">
          <Cropper
            src={imageSrc}
            style={{ height: 400, width: "100%" }}
            aspectRatio={aspectRatio}
            guides
            viewMode={0}
            dragMode="move"
            autoCropArea={1}
            background={false}
            responsive
            checkOrientation={false}
            cropBoxMovable={false}
            cropBoxResizable={false}
            ready={handleReady}
            ref={cropperRef}
          />
        </div>

        <div className="rethink-cropper__toolbar">
          <button className="rethink-cropper__tool" onClick={rotateLeft}>
            <RotateCcw size={20} /> Rotate Left
          </button>
          <button className="rethink-cropper__tool" onClick={rotateRight}>
            <RotateCw size={20} /> Rotate Right
          </button>
          <button className="rethink-cropper__tool" onClick={zoomOut}>
            <ZoomOut size={20} /> Shrink
          </button>
          <button className="rethink-cropper__tool" onClick={zoomIn}>
            <ZoomIn size={20} /> Enlarge
          </button>
          <button
            className="rethink-cropper__tool"
            onClick={fitInset}
            title="Contain: show entire image"
          >
            <Minimize2 size={20} /> Fit
          </button>
          <button
            className="rethink-cropper__tool"
            onClick={fillInset}
            title="Cover: fill inset without gaps"
          >
            <Maximize2 size={20} /> Fill
          </button>
          <button
            className="rethink-cropper__tool"
            onClick={centerImage}
            title="Center image in frame"
          >
            <Crosshair size={20} /> Center
          </button>
          <button className="rethink-cropper__tool" onClick={reset}>
            <Undo2 size={20} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
};
