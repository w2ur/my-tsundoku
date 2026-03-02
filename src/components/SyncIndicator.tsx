"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { onSyncStatusChange, getSyncStatus, type SyncStatus } from "@/lib/sync";
import { useTranslation } from "@/lib/preferences";

export default function SyncIndicator() {
  const { isSignedIn } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    return onSyncStatusChange(setStatus);
  }, []);

  if (!isSignedIn) return null;

  const label =
    status === "syncing"
      ? t("sync_syncing")
      : status === "unsynced"
        ? t("sync_pending").replace("{count}", "")
        : t("sync_synced");

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
    >
      <div className="relative p-2 rounded-lg transition-colors" aria-label={label}>
        {status === "syncing" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-forest/60 animate-spin"
            style={{ animationDuration: "1.5s" }}
          >
            <path d="M21 12a9 9 0 1 1-6.22-8.56" />
          </svg>
        ) : status === "unsynced" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber"
          >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-forest/30"
          >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        )}
      </div>
      {showTooltip && (
        <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-surface border border-forest/10 rounded-lg shadow-lg text-xs text-forest whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  );
}
