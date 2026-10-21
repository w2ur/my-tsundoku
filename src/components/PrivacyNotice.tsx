import Link from "next/link";
import { composeNotice, PRIVACY_COPY, type PrivacyLocale } from "@/lib/privacy/notice";

interface PrivacyNoticeProps {
  locale: PrivacyLocale;
}

/**
 * The privacy notice page body. A server component: the text is static data, rendered
 * at build time. Every string goes through React text nodes, so only the links that
 * `composeNotice` resolved become markup.
 */
export default function PrivacyNotice({ locale }: PrivacyNoticeProps) {
  const sections = composeNotice(locale);
  const copy = PRIVACY_COPY[locale];

  return (
    <div lang={locale} className="bg-paper text-ink">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <header className="flex items-center justify-between border-b border-border-subtle py-3">
          <Link href={locale === "en" ? "/en" : "/"} className="font-serif text-2xl text-forest">
            My Tsundoku
          </Link>
        </header>

        <main className="mx-auto mb-12 mt-12 max-w-2xl md:mb-24 md:mt-16">
          <h1 className="font-serif text-[32px] font-normal leading-tight text-forest">
            {copy.heading}
          </h1>
          <p className="mt-2 text-sm text-subtle">{copy.updated}</p>

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="mt-10">
              <h2 className="font-serif text-xl text-forest">{section.title}</h2>
              {section.paragraphs.map((segments, i) => (
                <p key={i} className={`${i === 0 ? "mt-2" : "mt-3"} text-base text-muted`}>
                  {segments.map((seg, j) =>
                    seg.kind === "text" ? (
                      seg.text
                    ) : (
                      <a
                        key={j}
                        href={seg.href}
                        {...(seg.external ? { target: "_blank", rel: "noopener" } : {})}
                        className="text-forest underline underline-offset-4 hover:text-ink"
                      >
                        {seg.text}
                      </a>
                    ),
                  )}
                </p>
              ))}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
