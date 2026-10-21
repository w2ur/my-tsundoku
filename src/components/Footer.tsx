"use client";

import { useTranslation } from "@/lib/preferences";
import { tFor, type Locale } from "@/lib/i18n";
import { CODE_URL } from "@/lib/landing";
import { PRIVACY_PATHS } from "@/lib/privacy/routes";

interface FooterProps {
  /** Overrides the stored preference: server-rendered pages with a fixed language (`/en`). */
  locale?: Locale;
}

export default function Footer({ locale }: FooterProps) {
  const { t: preferred, locale: preferredLocale } = useTranslation();
  const t = locale ? tFor(locale) : preferred;
  const privacyHref = PRIVACY_PATHS[locale ?? preferredLocale];
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <footer className="py-1.5 md:py-3 pb-safe flex-shrink-0 text-center text-xs text-balance text-subtle">
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
        href={CODE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-ink transition-colors"
      >
        {t("footer_code")}
      </a>
      {" · "}
      <a
        href={`mailto:contact@my-tsundoku.app?subject=${encodeURIComponent("[Tsundoku] " + t("footer_mailtoSubject"))}`}
        className="underline hover:text-ink transition-colors"
      >
        {t("contactMe")}
      </a>
      {" · "}
      <a href={privacyHref} className="underline hover:text-ink transition-colors">
        {t("footer_privacy")}
      </a>
    </footer>
  );
}
