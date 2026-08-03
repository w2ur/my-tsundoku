"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useTranslation } from "@/lib/preferences";
import { STAGE_CONFIG } from "@/lib/constants";
import type { Stage } from "@/lib/types";
import type { TranslationKeys } from "@/lib/i18n";
import StageIcon from "./StageIcon";

const STAGE_ROWS: { stage: Stage; nameKey: TranslationKeys; descKey: TranslationKeys }[] = [
  { stage: "a_acheter", nameKey: "welcome_stageAcheter", descKey: "welcome_stageAcheterDesc" },
  { stage: "tsundoku", nameKey: "welcome_stageTsundoku", descKey: "welcome_stageTsundokuDesc" },
  { stage: "bibliotheque", nameKey: "welcome_stageBibliotheque", descKey: "welcome_stageBibliothequeDesc" },
  { stage: "revendre", nameKey: "welcome_stageRevendre", descKey: "welcome_stageRevendreDesc" },
];

export default function WelcomeGuide() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  const hasSeenWelcome = useLiveQuery(
    async () => (await db.settings.get("hasSeenWelcome")) ?? null,
    []
  );

  // Still loading from DB
  if (hasSeenWelcome === undefined) {
    return null;
  }

  if (dismissed || hasSeenWelcome?.value === true) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    db.settings.put({ key: "hasSeenWelcome", value: true });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-forest/30"
        onClick={handleDismiss}
      />
      <div className="relative bg-paper rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm mx-auto">
        <h2 className="font-serif text-xl font-semibold text-ink text-center">
          {t("welcome_title")}
        </h2>
        <p className="text-sm text-subtle text-center mt-1">
          {t("welcome_subtitle")}
        </p>

        {/* These four rows are the user's first sight of each stage glyph, so
            they have to be the same SVGs the tab bar uses — not the emoji they
            used to hardcode, which no longer appear anywhere else. */}
        <div className="mt-6 space-y-4">
          {STAGE_ROWS.map(({ stage, nameKey, descKey }) => (
            <div key={stage} className="flex items-start gap-3">
              <span className="w-8 flex-shrink-0 flex justify-center pt-0.5">
                <StageIcon stage={stage} size={20} className={STAGE_CONFIG[stage].color} />
              </span>
              <p className="text-sm text-muted">
                <span className="font-bold">{t(nameKey)}</span> — {t(descKey)}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={handleDismiss}
          className="mt-6 w-full py-3 bg-forest text-paper rounded-lg font-medium text-sm hover:bg-forest/90 transition-colors"
        >
          {t("welcome_cta")}
        </button>
      </div>
    </div>
  );
}
