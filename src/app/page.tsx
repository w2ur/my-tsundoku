import HomeApp from "@/components/HomeApp";
import LandingGate from "@/components/LandingGate";
import LandingSection from "@/components/LandingSection";

export default function Home() {
  return (
    <>
      <HomeApp />
      <LandingGate>
        <LandingSection locale="fr" />
      </LandingGate>
    </>
  );
}
