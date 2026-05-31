# Util UI Usage Guideline

## Purpose
Use utility UI components for common application interactions, layout helpers, scrolling, loading, and small display patterns.

## Ownership
- Utility UI is for cross-domain layout and interaction helpers.
- Module-specific controls still belong in Model.Util.
- Docs pages may use utility UI for scroll sections and navigation.

## Current Akan Patterns
- Prefer existing utility components before adding custom layout code.
- Keep imported utility UI usage close to nearby docs and app examples.
- Forward className and preserve composition.

## Codegen Rules
- Do not make utility UI carry model-specific business behavior.
- Do not duplicate util components in each module.
- Do not use utility components without checking expected props.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
