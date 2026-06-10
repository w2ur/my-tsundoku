import type { Metadata } from "next";
import Link from "next/link";
import LandingSection from "@/components/LandingSection";
import { LANDING } from "@/lib/landing";

export const metadata: Metadata = {
  title: "My Tsundoku — organize your to-be-read pile",
  description: LANDING.en.metaDescription,
  alternates: {
    canonical: "/en",
    languages: { fr: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    title: "My Tsundoku",
    description: LANDING.en.metaDescription,
    url: "https://www.my-tsundoku.app/en",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export default function EnglishLanding() {
  return (
    <div className="min-h-screen bg-paper">
      <LandingSection locale="en" />
      <p className="pb-16 text-center text-sm">
        <Link href="/" className="underline text-forest hover:opacity-80">
          Open the app
        </Link>
      </p>
    </div>
  );
}
