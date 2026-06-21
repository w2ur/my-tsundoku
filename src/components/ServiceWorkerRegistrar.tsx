"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/preferences";

/**
 * Registers the Serwist service worker and surfaces a user-visible
 * "App updated — reload" toast when a new SW takes control.
 *
 * The SW uses skipWaiting: true + clientsClaim: true, meaning it takes
 * control immediately without a waiting phase. We detect the controller
 * change (which fires after the first activation) and skip the very first
 * change (initial registration) so we only show the banner on genuine
 * updates to an already-active session.
 */
export default function ServiceWorkerRegistrar() {
  const { t } = useTranslation();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js");

    // Track whether an SW was already controlling the page at startup.
    // If yes, any subsequent controllerchange is a genuine update.
    let hadController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (hadController) {
        // A new SW just took control — there was already one running
        setUpdateReady(true);
      } else {
        // First activation (fresh install) — mark as controlled, no banner
        hadController = true;
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  function handleReload() {
    window.location.reload();
  }

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-forest text-paper rounded-xl shadow-lg text-sm max-w-xs w-full mx-4">
      <span className="flex-1">{t("sw_updateAvailable")}</span>
      <button
        onClick={handleReload}
        className="flex-shrink-0 px-3 py-1.5 bg-paper text-forest rounded-lg text-xs font-medium hover:bg-cream transition-colors"
      >
        {t("sw_updateReload")}
      </button>
    </div>
  );
}
