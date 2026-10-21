import type { Metadata } from "next";
import Footer from "@/components/Footer";
import PrivacyNotice from "@/components/PrivacyNotice";
import { PRIVACY_PATHS } from "@/lib/privacy/routes";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Confidentialité — My Tsundoku",
  description: "Quelles données My Tsundoku traite, où elles vont et comment exercer vos droits.",
  alternates: {
    canonical: PRIVACY_PATHS.fr,
    languages: { fr: PRIVACY_PATHS.fr, en: PRIVACY_PATHS.en, "x-default": PRIVACY_PATHS.fr },
  },
};

export default function PrivacyFr() {
  return (
    <div className="min-h-screen bg-paper">
      <PrivacyNotice locale="fr" />
      <Footer locale="fr" />
    </div>
  );
}
