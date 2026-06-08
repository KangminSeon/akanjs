# akanjs

## 2.2.11

### Patch Changes

- 8190632: Add Akan server console support with CLI/build integration and documentation for console-oriented workflows.
- 4bce7f9: Add initial LLM discovery docs and stabilize Akan client/runtime behavior.

  - Add `/llms.txt` documentation discovery for Akan docs.
  - Add `wsConnect` support for automatic WebSocket connections.
  - Delay client bootstrap module execution until the SSR fizz stream is ready.
  - Improve route tree, HMR, fetch, store, and SSR/client runtime stability.

## 2.2.7

### Patch Changes

- bf51564: fix: base dictionary translation failed in some cases
- bf51564: fix: file upload contract workaround on shared Field.Img component

## 2.2.5

### Patch Changes

- d636456: add rich Map methods on memory() helper service
- a1ee4e8: fill nested constant defaults for arrays on document save and load, normalize date fields to a consistent epoch representation on store (accepting legacy ISO-string values on read), and correct falsy defaults in getDefault
- 5cdb05e: reverse dependency of file upload api
- a7da50e: remove dependency from radix dialog

## 2.2.3

### Patch Changes

- 587cc68: fix dictionary loading
- 587cc68: fix fetchClient for setting origin with clone or fetchPolicy

## 2.2.0

### Minor Changes

- cb5b07a: enable custom not found and error render on \_layout.tsx files
- 258284e: initial js bundle size is optimized as single language dictionary on ssr
