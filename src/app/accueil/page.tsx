import type { Metadata } from "next";
import Footer from "@/components/Footer";
import LandingPage from "@/components/LandingPage";

/**
 * The French landing without EntryGate, for a returning user who wants to see it
 * again (Settings › À propos). `/` already serves this page to crawlers, so this
 * copy is noindex and points its canonical there.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
};

export default function FrenchLanding() {
  return (
    <div className="min-h-screen bg-paper">
      <LandingPage locale="fr" standalone />
      <Footer />
    </div>
  );
}
