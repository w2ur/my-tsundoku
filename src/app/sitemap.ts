import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.my-tsundoku.app",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://www.my-tsundoku.app/en",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
