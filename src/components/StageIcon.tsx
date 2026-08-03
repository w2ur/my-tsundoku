import type { Stage } from "@/lib/types";

/**
 * Stage glyphs as SVG rather than emoji.
 *
 * The stages previously used 📋 📚 📖 👋. Emoji render per-platform, cannot be
 * themed, and 📚/📖 are hard to tell apart at nav size — which mattered because
 * StageTabs hides its text labels below the sm breakpoint, leaving the emoji as
 * the only label on the smallest screens.
 *
 * Each path is chosen to stay distinguishable at 16px: an outline (wishlist),
 * a stack of three (pile), an open spread (library), a tag (to sell).
 */
const PATHS: Record<Stage, React.ReactNode> = {
  // Wishlist — a bookmark/wanted marker
  a_acheter: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  // Tsundoku — a stack of stacked volumes
  tsundoku: (
    <>
      <path d="M4 19h16" />
      <rect x="5" y="4" width="14" height="4" rx="1" />
      <rect x="5" y="10" width="14" height="4" rx="1" />
    </>
  ),
  // Library — an open book
  bibliotheque: (
    <>
      <path d="M12 7v13" />
      <path d="M3 18a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 2 3 3 0 0 0-3-2z" />
    </>
  ),
  // To sell — a price tag
  revendre: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
};

export default function StageIcon({
  stage,
  size = 16,
  className,
}: {
  stage: Stage;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[stage]}
    </svg>
  );
}
