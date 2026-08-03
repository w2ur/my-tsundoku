"use client";

import { useTranslation } from "@/lib/preferences";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-paper">
      <h1 className="font-serif text-3xl text-forest mb-2">{t("error_title")}</h1>
      <p className="text-subtle text-center max-w-sm mb-6">
        {t("error_text")}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-forest text-paper rounded-full text-sm font-medium hover:bg-forest/90 transition-colors"
      >
        {t("error_retry")}
      </button>
    </div>
  );
}
