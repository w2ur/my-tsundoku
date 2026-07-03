"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/preferences";

export default function OfflinePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-paper">
      <h1 className="font-serif text-3xl text-forest mb-4">{t("offline_title")}</h1>
      <p className="text-forest/50 text-center max-w-sm">
        {t("offline_text")}
      </p>
      <Link
        href="/"
        className="mt-6 px-5 py-2.5 bg-forest text-paper rounded-full text-sm font-medium hover:bg-forest/90 transition-colors"
      >
        {t("offline_button")}
      </Link>
    </div>
  );
}
