export const createRobotPage = (
  clientHttpUri: string,
  config?: { rules: { userAgent: string; allow: string; disallow: string }; sitemap: string },
): { rules: { userAgent: string; allow: string; disallow: string }; sitemap: string } => {
  return {
    ...(config ?? {}),
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin/",
      ...(config?.rules ?? {}),
    },
    sitemap: `${clientHttpUri}/sitemap.xml`,
  };
};
