"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "@/lib/preferences";
import type { IScannerControls } from "@zxing/browser";

interface Props {
  onScan: (isbn: string) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScan, onError }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"init" | "scanning" | "needs-gesture" | "error">("init");
  const controlsRef = useRef<IScannerControls | null>(null);
  const stoppedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  const tRef = useRef(t);
  tRef.current = t;

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;

    // Check if camera API is available
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      onErrorRef.current?.(tRef.current("scanner_notAvailable"));
      return;
    }

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (stoppedRef.current) return;

      const reader = new BrowserMultiFormatReader();

      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result, error) => {
          if (error) {
            // NotFoundException fires on every frame without a barcode — expected, not a real error
            // Only log unexpected errors in dev to aid debugging
            if (process.env.NODE_ENV === "development") {
              const name = (error as { name?: string }).name ?? "";
              if (name !== "NotFoundException") {
                console.debug("[BarcodeScanner] decode error:", error);
              }
            }
            return;
          }
          if (!result) return;

          const cleaned = result.getText().replace(/[^0-9X]/gi, "");
          if (cleaned.length === 10 || cleaned.length === 13) {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            controlsRef.current?.stop();
            onScanRef.current(cleaned);
          }
        }
      );

      if (stoppedRef.current) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setStatus("scanning");
    } catch (err) {
      // Camera failed — could be PWA needing user gesture, or denied permission
      if (process.env.NODE_ENV === "development") {
        console.debug("[BarcodeScanner] startScanner failed:", err);
      }
      setStatus("needs-gesture");
    }
  }, []);

  useEffect(() => {
    // Try auto-start (works when permission already granted or in browser context)
    startScanner();

    return () => {
      stoppedRef.current = true;
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.debug("[BarcodeScanner] stop error on cleanup:", err);
          }
        }
        controlsRef.current = null;
      }
    };
  }, [startScanner]);

  async function handleManualStart() {
    setStatus("init");
    // Clean up previous failed scanner instance
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[BarcodeScanner] stop error on manual restart:", err);
        }
      }
      controlsRef.current = null;
    }
    stoppedRef.current = false;

    try {
      // Request camera with user gesture first
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // Permission granted — stop this stream and let @zxing/browser take over
      stream.getTracks().forEach((track) => track.stop());
      await startScanner();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[BarcodeScanner] handleManualStart failed:", err);
      }
      setStatus("error");
      onErrorRef.current?.(tRef.current("scanner_accessError"));
    }
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full rounded-xl overflow-hidden bg-black"
        style={{ display: status === "scanning" ? "block" : "none" }}
        muted
        playsInline
      />
      {status === "init" && (
        <div className="flex items-center justify-center h-48 bg-cream rounded-xl">
          <p className="text-sm text-forest/30">{t("scanner_init")}</p>
        </div>
      )}
      {status === "needs-gesture" && (
        <div className="flex flex-col items-center justify-center h-48 bg-cream rounded-xl gap-3">
          <p className="text-sm text-forest/50">{t("scanner_permissionRequired")}</p>
          <button
            onClick={handleManualStart}
            className="px-5 py-2.5 bg-forest text-paper rounded-lg text-sm font-medium hover:bg-forest/90 transition-colors"
          >
            {t("scanner_activate")}
          </button>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center justify-center h-48 bg-cream rounded-xl">
          <p className="text-sm text-forest/40">{t("scanner_unavailable")}</p>
        </div>
      )}
    </div>
  );
}
