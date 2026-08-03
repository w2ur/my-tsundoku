"use client";

import { STAGES, STAGE_CONFIG } from "@/lib/constants";
import type { Stage } from "@/lib/types";
import { useTranslation } from "@/lib/preferences";
import StageIcon from "./StageIcon";

interface StageTabsProps {
  active: Stage;
  counts: Record<Stage, number>;
  onChange: (stage: Stage) => void;
  searchActive?: boolean;
}

export default function StageTabs({ active, counts, onChange, searchActive }: StageTabsProps) {
  const { t } = useTranslation();

  return (
    <div role="tablist" className="flex border-b border-border-subtle">
      {STAGES.map((stage) => {
        const config = STAGE_CONFIG[stage];
        const isActive = stage === active;
        const hasResults = counts[stage] > 0;

        let badgeClass: string;
        if (isActive) {
          badgeClass = "bg-forest text-paper";
        } else if (searchActive && hasResults) {
          // amber-ink rather than amber: plain amber on its own 20% tint sat at
          // 2.14:1, and this is the one badge state that has to read.
          badgeClass = "bg-amber/25 text-amber-ink";
        } else if (searchActive && !hasResults) {
          badgeClass = "bg-forest/5 text-faint";
        } else {
          badgeClass = "bg-forest/10 text-muted";
        }

        // Stacked icon-over-label so the full label fits: "Livres à acheter"
        // cannot fit a ~93px tab horizontally, which is why the label used to be
        // hidden below sm — leaving an emoji as the only nav label on phones.
        return (
          <button
            key={stage}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(stage)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 min-h-[52px] px-1 py-2 transition-colors border-b-2 ${
              isActive
                ? "border-forest text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <StageIcon stage={stage} size={17} />
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold transition-colors ${badgeClass}`}
              >
                {counts[stage]}
              </span>
            </span>
            <span className="text-[10px] leading-tight font-medium truncate max-w-full">
              {t(config.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
