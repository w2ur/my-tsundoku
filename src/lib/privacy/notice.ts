/**
 * Renderer for the shared privacy notice.
 *
 * The three JSON files next to this module are VENDORED, byte-identical copies of the
 * canonical notice shared across William's sites (common blocks, hosts, and this site's
 * own file). Never edit or re-serialise them here: copy them in with `cp`. The text is
 * final; this module only decides what shows and in what order.
 *
 * The page order is the site file's `compose` list ("block:id"). Inline links are written
 * `[text](key)` and resolved through the merged `links` maps: site first, then common,
 * then hosts. Only `https:` and `mailto:` targets are accepted, and an unknown key throws
 * so a broken notice fails the build instead of shipping a dead link. A section whose
 * `status` starts with "pending" is never rendered.
 *
 * Pure data, no Dexie or Supabase: the privacy pages are static and render on the server.
 */
import common from "./privacy.common.json";
import hosts from "./privacy.hosts.json";
import site from "./privacy.my-tsundoku.json";

export type PrivacyLocale = "fr" | "en";

export interface PrivacySection {
  id: string;
  title: string;
  titleFr: string;
  paragraphs: string[];
  paragraphsFr: string[];
  status?: string;
}

export interface PrivacyBlock {
  block: string;
  links?: Record<string, string>;
  sections: PrivacySection[];
}

export interface PrivacySiteBlock extends PrivacyBlock {
  compose: string[];
  routes: Record<PrivacyLocale, string>;
}

export interface PrivacySources {
  site: PrivacySiteBlock;
  common: PrivacyBlock;
  hosts: PrivacyBlock;
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string; external: boolean };

export interface RenderedSection {
  id: string;
  title: string;
  paragraphs: Segment[][];
}

export const PRIVACY_SOURCES: PrivacySources = {
  site: site as PrivacySiteBlock,
  common: common as PrivacyBlock,
  hosts: hosts as PrivacyBlock,
};

export const PRIVACY_ROUTES: Record<PrivacyLocale, string> = PRIVACY_SOURCES.site.routes;

export const PRIVACY_COPY: Record<PrivacyLocale, { heading: string; updated: string }> = {
  fr: { heading: "Confidentialité", updated: "Mis à jour le 21 octobre 2026" },
  en: { heading: "Privacy", updated: "Last updated 21 October 2026" },
};

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Site wins over common, common over hosts. */
export function mergeLinks(sources: PrivacySources): Record<string, string> {
  return {
    ...(sources.hosts.links ?? {}),
    ...(sources.common.links ?? {}),
    ...(sources.site.links ?? {}),
  };
}

/** Turns `[text](key)` into link segments; everything else stays plain text (escaped by React). */
export function parseInline(text: string, links: Record<string, string>): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const [whole, label, key] = match;
    const href = links[key];
    if (href === undefined) {
      throw new Error(`Privacy notice: unknown link key "${key}" in "${text}"`);
    }
    if (!href.startsWith("https:") && !href.startsWith("mailto:")) {
      throw new Error(`Privacy notice: link "${key}" must be https: or mailto:, got "${href}"`);
    }
    const start = match.index;
    if (start > last) segments.push({ kind: "text", text: text.slice(last, start) });
    segments.push({ kind: "link", text: label, href, external: href.startsWith("https:") });
    last = start + whole.length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

export function isPending(section: PrivacySection): boolean {
  return typeof section.status === "string" && /^pending\b/.test(section.status);
}

/** Looks up one compose entry ("block:id"); throws when it does not resolve. */
export function resolveEntry(entry: string, sources: PrivacySources): PrivacySection {
  const [blockName, id, ...rest] = entry.split(":");
  const block =
    blockName === "site" || blockName === "common" || blockName === "hosts"
      ? sources[blockName]
      : undefined;
  const section = rest.length === 0 ? block?.sections.find((s) => s.id === id) : undefined;
  if (!section) throw new Error(`Privacy notice: compose entry "${entry}" does not resolve`);
  return section;
}

export function composeNotice(
  locale: PrivacyLocale,
  sources: PrivacySources = PRIVACY_SOURCES,
): RenderedSection[] {
  const links = mergeLinks(sources);
  return sources.site.compose
    .map((entry) => resolveEntry(entry, sources))
    .filter((section) => !isPending(section))
    .map((section) => ({
      id: section.id,
      title: locale === "fr" ? section.titleFr : section.title,
      paragraphs: (locale === "fr" ? section.paragraphsFr : section.paragraphs).map((p) =>
        parseInline(p, links),
      ),
    }));
}
