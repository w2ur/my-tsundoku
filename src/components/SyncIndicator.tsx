"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
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
          /* Pen writing on paper — gentle horizontal oscillation */
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
            animate={{ x: [0, 1.5, 0, -1.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </motion.svg>
        ) : status === "unsynced" ? (
          /* Warning triangle — crystal clear error state */
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
            className="text-amber-ink"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        ) : (
          /* Closed notebook — at rest, synced */
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
            className="text-subtle"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
        )}
      </div>
      {showTooltip && (
        <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-surface border border-border-subtle rounded-lg shadow-lg text-xs text-forest whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  );
}
