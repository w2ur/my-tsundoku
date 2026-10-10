import Link from "next/link";
import EnterAppButton from "@/components/EnterAppButton";
import StageIcon from "@/components/StageIcon";
import { STAGE_CONFIG } from "@/lib/constants";
import { CODE_URL, LANDING } from "@/lib/landing";

interface LandingPageProps {
  locale: "fr" | "en";
}

const IMG = "/landing";

export default function LandingPage({ locale }: LandingPageProps) {
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
    <div lang={locale} className="bg-paper text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <header className="flex items-center justify-between border-b border-border-subtle py-3">
          <span className="font-serif text-2xl text-forest">My Tsundoku</span>
          <EnterAppButton label={content.enterAppLabel} navigateHome={locale === "en"} />
        </header>

        <main>
          <section className="mx-auto max-w-2xl pt-12 text-center md:pt-24">
            <h1 className="font-serif text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-forest md:text-[56px]">
              {content.heroTitle}
            </h1>
            <p className="mt-4 text-base text-muted">{content.heroSubtitle}</p>
            <Link
              href="/add"
              className="mt-8 block rounded-lg bg-forest px-6 py-3 text-center text-sm font-medium text-paper transition-colors hover:bg-forest/90 md:inline-block"
            >
              {content.ctaLabel}
            </Link>
            <p className="mt-3 text-sm text-subtle">{content.reassurance}</p>
          </section>

          <figure className="mt-12 md:mt-16">
            {(["light", "dark"] as const).map((theme) => (
              <picture
                key={theme}
                className={theme === "light" ? "theme-light-only block" : "theme-dark-only"}
              >
                <source
                  media="(min-width: 768px)"
                  srcSet={`${IMG}/board-1440-${theme}.webp`}
                  width={1440}
                  height={900}
                />
                <img
                  src={`${IMG}/pile-a_acheter-${theme}.webp`}
                  width={390}
                  height={844}
                  alt={content.screenshotAlt}
                  loading={theme === "dark" ? "lazy" : undefined}
                  decoding="async"
                  className="mx-auto h-auto w-full max-w-[390px] rounded-lg border border-border-subtle md:max-w-none"
                />
              </picture>
            ))}
          </figure>

          <section className="mt-12 md:mt-24">
            <h2 className="font-serif text-[32px] font-normal text-forest">{content.pilesTitle}</h2>
            <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-6">
              {content.piles.map((pile) => (
                <li key={pile.stage}>
                  <figure>
                    {(["light", "dark"] as const).map((theme) => (
                      <picture
                        key={theme}
                        className={theme === "light" ? "theme-light-only block" : "theme-dark-only"}
                      >
                        <img
                          src={`${IMG}/pile-${pile.stage}-${theme}.webp`}
                          width={390}
                          height={844}
                          alt={`${pile.name} — ${pile.caption}`}
                          loading="lazy"
                          decoding="async"
                          className="aspect-[4/3] w-full rounded-lg border border-border-subtle object-cover object-top md:aspect-[3/4]"
                        />
                      </picture>
                    ))}
                    <figcaption className="mt-3">
                      <h3 className="flex items-center gap-2 text-xl font-serif text-forest">
                        <StageIcon
                          stage={pile.stage}
                          size={20}
                          className={STAGE_CONFIG[pile.stage].color}
                        />
                        {pile.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted">{pile.caption}</p>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ol>
          </section>

          <section className="mx-auto mt-12 max-w-2xl md:mt-24">
            <h2 className="font-serif text-xl text-forest">{content.scan.title}</h2>
            <p className="mt-2 text-base text-muted">{content.scan.body}</p>
          </section>

          <section className="mx-auto mt-12 max-w-2xl md:mt-12">
            <h2 className="font-serif text-xl text-forest">{content.privacy.title}</h2>
            <p className="mt-2 text-base text-muted">{content.privacy.body}</p>
            <a
              href={CODE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-forest underline underline-offset-4 hover:text-ink"
            >
              {content.privacy.codeLinkLabel}
            </a>
          </section>

          <section className="mx-auto mb-12 mt-12 max-w-2xl md:mb-24">
            <h2 className="font-serif text-xl text-forest">{content.faqTitle}</h2>
            <div className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
              {content.faq.map((item) => (
                <details key={item.question} className="group py-3">
                  <summary className="cursor-pointer text-base text-ink">{item.question}</summary>
                  <p className="mt-2 text-base text-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
