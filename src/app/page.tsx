import EntryGate from "@/components/EntryGate";
import Footer from "@/components/Footer";
import HomeApp from "@/components/HomeApp";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  return (
    <>
      <EntryGate />
      <div data-surface="landing">
        <LandingPage locale="fr" />
        <Footer />
      </div>
      <div data-surface="app">
        <HomeApp />
      </div>
    </>
  );
}
