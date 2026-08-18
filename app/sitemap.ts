import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-05-24");

  return [
    {
      url: "https://matclock.online/",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://matclock.online/privacy",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://matclock.online/about",
      lastModified: new Date("2026-08-18"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://matclock.online/cookies",
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
