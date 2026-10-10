import EntryGate from "@/components/EntryGate";
import Footer from "@/components/Footer";
import HomeApp from "@/components/HomeApp";
import LandingSection from "@/components/LandingSection";

export default function Home() {
  return (
    <>
      <EntryGate />
      <div data-surface="landing">
        <LandingSection locale="fr" />
        <Footer />
      </div>
      <div data-surface="app">
        <HomeApp />
      </div>
    </>
  );
}
