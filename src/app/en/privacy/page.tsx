import type { Metadata } from "next";
import Footer from "@/components/Footer";
import PrivacyNotice from "@/components/PrivacyNotice";
import { PRIVACY_PATHS } from "@/lib/privacy/routes";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy — My Tsundoku",
  description: "What data My Tsundoku handles, where it goes and how to use your rights.",
  alternates: {
    canonical: PRIVACY_PATHS.en,
    languages: { fr: PRIVACY_PATHS.fr, en: PRIVACY_PATHS.en, "x-default": PRIVACY_PATHS.fr },
  },
};

export default function PrivacyEn() {
  return (
    <div className="min-h-screen bg-paper">
      <PrivacyNotice locale="en" />
      <Footer locale="en" />
    </div>
  );
}
