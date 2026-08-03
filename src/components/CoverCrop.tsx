"use client";

import { useRef, useState, useCallback } from "react";
import ReactCrop, { type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useTranslation } from "@/lib/preferences";

interface Props {
  src: string;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

function getCroppedCanvas(image: HTMLImageElement, crop: PixelCrop): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  const maxSize = 400;
  if (canvas.width > maxSize || canvas.height > maxSize) {
    const ratio = Math.min(maxSize / canvas.width, maxSize / canvas.height);
    const resized = document.createElement("canvas");
    resized.width = canvas.width * ratio;
    resized.height = canvas.height * ratio;
    resized.getContext("2d")!.drawImage(canvas, 0, 0, resized.width, resized.height);
    return resized;
  }
  return canvas;
}

export default function CoverCrop({ src, onCrop, onCancel }: Props) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<PixelCrop | undefined>(undefined);

  const handleConfirm = useCallback(() => {
    const image = imgRef.current;
    if (!image || !crop || crop.width === 0 || crop.height === 0) return;
    const canvas = getCroppedCanvas(image, crop);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onCrop(dataUrl);
  }, [crop, onCrop]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl p-6 shadow-xl max-w-sm w-full border border-border-subtle flex flex-col gap-4">
        <h2 className="font-serif text-xl text-forest">{t("cover_cropTitle")}</h2>
        <div className="flex justify-center overflow-auto max-h-[60vh]">
          <ReactCrop
            crop={crop}
            onChange={(pixelCrop) => {
              setCrop(pixelCrop);
            }}
          >
            <img
              ref={imgRef}
              src={src}
              alt={t("form_coverPreviewAlt")}
              style={{ maxWidth: "100%", maxHeight: "60vh" }}
            />
          </ReactCrop>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!crop || crop.width === 0 || crop.height === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-forest text-paper text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("cover_cropConfirm")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-4 rounded-xl bg-cream text-forest text-sm font-medium transition-opacity hover:opacity-80"
          >
            {t("cover_cropCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
