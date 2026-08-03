"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import StageIcon from "@/components/StageIcon";
import { STAGES, STAGE_CONFIG } from "@/lib/constants";
import { useTranslation } from "@/lib/preferences";

const methods = [
  {
    href: "/add/scan",
    titleKey: "addBook_scanBarcode" as const,
    descKey: "addBook_scanDesc" as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <line x1="7" x2="17" y1="12" y2="12" />
      </svg>
    ),
  },
  {
    href: "/add/manual",
    titleKey: "addBook_manualEntry" as const,
    descKey: "addBook_manualDesc" as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
];

export default function AddPage() {
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage");
  const { t } = useTranslation();

  if (!stage) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
          <h1 className="font-serif text-2xl text-forest mb-6">{t("addBook_title")}</h1>
          <p className="text-sm text-subtle mb-4">{t("addBook_stagePrompt")}</p>
          <div className="grid grid-cols-2 gap-3">
            {STAGES.map((s) => {
              const config = STAGE_CONFIG[s];
              return (
                <Link
                  key={s}
                  href={`/add?stage=${s}`}
                  className="flex flex-col items-center gap-2 p-4 bg-surface border border-border-subtle rounded-xl hover:border-border-strong hover:shadow-sm transition-all"
                >
                  <StageIcon stage={s} size={28} className={config.color} />
                  <span className="text-sm font-medium text-ink text-center">{t(config.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        <h1 className="font-serif text-2xl text-forest mb-6">{t("addBook_title")}</h1>
        <div className="grid gap-3">
          {methods.map((m) => (
            <Link
              key={m.href}
              href={`${m.href}?stage=${stage}`}
              className="flex items-center gap-4 p-4 bg-surface border border-border-subtle rounded-xl hover:border-border-strong hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-forest/5 text-muted group-hover:bg-forest/10 transition-colors">
                {m.icon}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">{t(m.titleKey)}</h2>
                <p className="text-xs text-subtle">{t(m.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
