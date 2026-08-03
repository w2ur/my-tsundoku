"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/preferences";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-paper">
      <h1 className="font-serif text-5xl text-forest mb-2">404</h1>
      <p className="text-subtle text-center max-w-sm mb-6">
        {t("notFound_text")}
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-forest text-paper rounded-full text-sm font-medium hover:bg-forest/90 transition-colors"
      >
        {t("notFound_button")}
      </Link>
    </div>
  );
}
