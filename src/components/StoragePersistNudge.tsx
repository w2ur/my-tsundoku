"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isStoragePersistNudgePending, dismissStoragePersistNudge } from "@/lib/storage-persist";
import { useTranslation } from "@/lib/preferences";

export default function StoragePersistNudge() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  // Reads from localStorage — unavailable during SSR, so we initialize in an effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(isStoragePersistNudgePending());
  }, []);

  function handleDismiss() {
    dismissStoragePersistNudge();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="px-4 py-2 bg-amber/10 border-b border-amber/20 flex items-start gap-3 text-xs text-forest/70">
      <p className="flex-1">{t("persist_nudge")}</p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/settings" className="underline hover:text-forest/90 transition-colors">
          {t("export_library")}
        </Link>
        <button
          onClick={handleDismiss}
          className="text-forest/40 hover:text-forest/60 transition-colors"
          aria-label={t("persist_nudge_dismiss")}
        >
          ×
        </button>
      </div>
    </div>
  );
}
