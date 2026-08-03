"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/preferences";
import type { Stage } from "@/lib/types";

export default function AddButton({ stage }: { stage: Stage }) {
  const { t } = useTranslation();

  const href = `/add?stage=${stage}`;

  // bottom-safe adds env(safe-area-inset-bottom): the app is display:standalone,
  // so a flat bottom-6 (24px) put this button inside the iOS home indicator's
  // 34px gesture strip.
  return (
    <Link
      href={href}
      className="fixed bottom-safe right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-forest text-paper shadow-lg hover:bg-forest/90 active:scale-95 transition-all"
      aria-label={t("addButton_label")}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    </Link>
  );
}
