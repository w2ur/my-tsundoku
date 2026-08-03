"use client";

import { useTranslation } from "@/lib/preferences";

export default function Loading() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-border-strong border-t-forest/60 rounded-full animate-spin" />
        <p className="text-sm text-subtle">{t("loading")}</p>
      </div>
    </div>
  );
}
