"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/preferences";

interface LandingCtaProps {
  label: string;
  locale: "fr" | "en";
}

/** The hero's single filled action. Stays a real link to /add so crawlers and no-JS visitors follow it. */
export default function LandingCta({ label, locale }: LandingCtaProps) {
  const { setLocale } = useTranslation();

  return (
    <Link
      href="/add"
      // /en is English-only: carry that choice into the app, which defaults to French.
      onClick={locale === "en" ? () => setLocale("en") : undefined}
      className="mt-8 block rounded-lg bg-forest px-6 py-3 text-center text-sm font-medium text-paper transition-colors hover:bg-forest/90 md:inline-block"
    >
      {label}
    </Link>
  );
}
