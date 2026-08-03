"use client";

import { STAGE_CONFIG } from "@/lib/constants";
import type { Stage } from "@/lib/types";
import { useTranslation } from "@/lib/preferences";
import StageIcon from "./StageIcon";

export default function StageBadge({ stage }: { stage: Stage }) {
  const config = STAGE_CONFIG[stage];
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide uppercase ${config.bgColor} ${config.color}`}
    >
      <StageIcon stage={stage} size={14} />
      {t(config.labelKey)}
    </span>
  );
}
