"use client";

import { useTranslation } from "@/lib/preferences";

export default function Footer() {
  const { t } = useTranslation();
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <footer className="py-1.5 md:py-3 pb-safe flex-shrink-0 text-center text-[11px] text-subtle">
      {t("footer_madeBy")}{" "}
      <a
        href="https://william.revah.paris"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-ink transition-colors"
      >
        William
      </a>
      {version && (
        <>
          {" · "}
          <span>v{version}</span>
        </>
      )}
      {" · "}
      <a
        href={`mailto:contact@my-tsundoku.app?subject=${encodeURIComponent("[Tsundoku] " + t("footer_mailtoSubject"))}`}
        className="underline hover:text-ink transition-colors"
      >
        {t("contactMe")}
      </a>
    </footer>
  );
}
