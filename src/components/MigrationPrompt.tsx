"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/preferences";

interface MigrationPromptProps {
  bookCount: number;
  onUpload: () => Promise<void>;
  onSkip: () => void;
}

export default function MigrationPrompt({ bookCount, onUpload, onSkip }: MigrationPromptProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    setUploading(true);
    try {
      await onUpload();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl p-6 shadow-xl max-w-sm w-full border border-border-subtle">
        <h2 className="font-serif text-xl text-forest mb-2">
          {t("migration_title")}
        </h2>
        <p className="text-sm text-muted mb-6">
          {t("migration_message").replace("{count}", String(bookCount))}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 px-4 rounded-xl bg-forest text-paper text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? t("migration_uploading") : t("migration_upload")}
          </button>
          <button
            onClick={onSkip}
            disabled={uploading}
            className="w-full py-2.5 px-4 rounded-xl bg-cream text-forest text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-60"
          >
            {t("migration_skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
