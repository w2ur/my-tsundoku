import Link from "next/link";
import { LANDING } from "@/lib/landing";

interface LandingSectionProps {
  locale: "fr" | "en";
}

export default function LandingSection({ locale }: LandingSectionProps) {
  const content = LANDING[locale];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "My Tsundoku",
    description: content.metaDescription,
    url: "https://www.my-tsundoku.app",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };

  return (
    <section lang={locale} className="bg-paper text-ink px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="font-serif text-3xl md:text-4xl text-forest">
            {content.heroTitle}
          </h1>
          <p className="text-base text-ink/70">{content.heroSubtitle}</p>
        </header>
        {content.sections.map((s) => (
          <div key={s.title} className="space-y-2">
            <h2 className="font-serif text-xl text-forest">{s.title}</h2>
            <p className="text-sm leading-relaxed text-ink/80">{s.body}</p>
          </div>
        ))}
        <p className="text-center">
          <Link
            href="/add"
            className="inline-block bg-forest text-cream px-6 py-3 rounded-full text-sm hover:opacity-90 transition-opacity"
          >
            {content.ctaLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}
