import type { MetadataRoute } from "next";

const publicRoutes = [
  "/",
  "/spare-parts",
  "/new-machines",
  "/old-machines",
  "/repairing",
  "/posts",
  "/about",
  "/contact",
  "/location",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return [];

  const baseUrl = new URL(siteUrl);
  return publicRoutes.map((route) => ({
    url: new URL(route, baseUrl).toString(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
