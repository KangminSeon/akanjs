const lastModified = new Date();
export const createSitemapPage = (clientHttpUri: string, paths: string[]): { url: string; lastModified: Date }[] => {
  return paths.map((path) => ({ url: `${clientHttpUri}${path}`, lastModified }));
};
