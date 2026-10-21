/**
 * Privacy notice paths, kept apart from `notice.ts` so the footer can link to them
 * without pulling the notice JSON into the client bundle. `notice.test.ts` holds them
 * equal to the `routes` of the vendored site file.
 */
export const PRIVACY_PATHS = { fr: "/confidentialite", en: "/en/privacy" } as const;
