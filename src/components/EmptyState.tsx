"use client";

import { getRandomQuote, type Quote } from "@/lib/quotes";
import { useMemo } from "react";
import { useTranslation } from "@/lib/preferences";

export default function EmptyState({ quote: quoteProp }: { quote?: Quote }) {
  const { locale } = useTranslation();
  const fallback = useMemo(() => getRandomQuote(locale), [locale]);
  const quote = quoteProp ?? fallback;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <p className="font-serif text-base italic text-subtle max-w-xs leading-relaxed">
        &laquo; {quote.text} &raquo;
      </p>
      <p className="mt-2 text-sm text-subtle">— {quote.author}</p>
    </div>
  );
}
