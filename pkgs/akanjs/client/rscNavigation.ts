declare global {
  var __AKAN_RSC_CLEAR_CACHE__: (() => void) | undefined;
  var __AKAN_RSC_NAVIGATE__:
    | ((href: string, options?: { replace?: boolean; scrollToTop?: boolean }) => Promise<void>)
    | undefined;
}

export const clearRscNavigationCache = () => {
  globalThis.__AKAN_RSC_CLEAR_CACHE__?.();
};

export const navigateRsc = (href: string, options?: { replace?: boolean; scrollToTop?: boolean }) => {
  return globalThis.__AKAN_RSC_NAVIGATE__?.(href, options);
};

export const useRscNavigation = () => ({
  clearCache: clearRscNavigationCache,
  navigate: navigateRsc,
});
