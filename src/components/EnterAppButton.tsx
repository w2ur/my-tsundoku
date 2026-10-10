"use client";

import { useRouter } from "next/navigation";
import { enterApp } from "@/lib/entry";

interface EnterAppButtonProps {
  label: string;
  /** On `/en` the app lives at `/`, so entering also navigates there. */
  navigateHome?: boolean;
}

/** Quiet text-style entry to the board: the only filled button on the landing is the hero CTA. */
export default function EnterAppButton({ label, navigateHome = false }: EnterAppButtonProps) {
  const router = useRouter();

  async function handleClick() {
    await enterApp();
    if (navigateHome) router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg px-3 py-2 text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink"
    >
      {label}
    </button>
  );
}
