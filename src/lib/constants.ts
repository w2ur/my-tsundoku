import type { TranslationKeys } from "./i18n";

export const STAGES = ["a_acheter", "tsundoku", "bibliotheque", "revendre"] as const;
export type Stage = (typeof STAGES)[number];

// Glyphs live in StageIcon.tsx as SVG. The `emoji` field this record used to
// carry was the only label on the mobile tab bar, and emoji cannot be themed,
// sized, or told apart reliably at nav size.
export const STAGE_CONFIG: Record<
  Stage,
  { labelKey: TranslationKeys; swipeLabelKey: TranslationKeys; color: string; bgColor: string }
> = {
  a_acheter: {
    labelKey: "stage_a_acheter",
    swipeLabelKey: "swipe_a_acheter",
    color: "text-amber-ink",
    bgColor: "bg-amber/10",
  },
  tsundoku: {
    labelKey: "stage_tsundoku",
    swipeLabelKey: "swipe_tsundoku",
    color: "text-ink",
    bgColor: "bg-forest/10",
  },
  bibliotheque: {
    labelKey: "stage_bibliotheque",
    swipeLabelKey: "swipe_bibliotheque",
    color: "text-ink",
    bgColor: "bg-forest/10",
  },
  revendre: {
    labelKey: "stage_revendre",
    swipeLabelKey: "swipe_revendre",
    color: "text-amber-ink",
    bgColor: "bg-amber/10",
  },
};

export const STAGE_TRANSITIONS: Record<Stage, { labelKey: TranslationKeys; next: Stage }[]> = {
  a_acheter: [{ labelKey: "transition_a_acheter_tsundoku", next: "tsundoku" }],
  tsundoku: [
    { labelKey: "transition_tsundoku_bibliotheque", next: "bibliotheque" },
    { labelKey: "transition_tsundoku_revendre", next: "revendre" },
  ],
  bibliotheque: [{ labelKey: "transition_bibliotheque_revendre", next: "revendre" }],
  revendre: [{ labelKey: "transition_revendre_bibliotheque", next: "bibliotheque" }],
};
