import type { MetadataRoute } from "next";
import { PRIVACY_PATHS } from "@/lib/privacy/routes";

const ORIGIN = "https://www.my-tsundoku.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: ORIGIN,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${ORIGIN}/en`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${ORIGIN}${PRIVACY_PATHS.fr}`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${ORIGIN}${PRIVACY_PATHS.en}`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
