import fr from "./fr";
import en from "./en";

export type TranslationKeys = keyof typeof fr;
export type Locale = "fr" | "en";

export const DEFAULT_LOCALE: Locale = "fr";

export const dictionaries: Record<Locale, Record<TranslationKeys, string>> = {
  fr,
  en,
};

export function plural(count: number, one: string, other: string): string {
  const template = count === 1 ? one : other;
  return template.replace("{count}", String(count));
}

/** Translation lookup bound to one locale: the single typed way to read a dictionary. */
export function tFor(locale: Locale): (key: TranslationKeys) => string {
  return (key) => dictionaries[locale][key];
}
