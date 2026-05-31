# Docs Page Rule Guideline

## Purpose
Use this when generating or updating Akan docs pages under the current docs route tree.

## Ownership
- Docs pages live under `apps/akan/page/(docs)`.
- Pages use `Docs`, `Code`, `Scroll`, and app localization helpers used by nearby pages.
- A docs page should teach one concept with examples, alerts, and navigation anchors.

## Current Akan Patterns
- Use current route groups: docs, conventions, references, cheatsheet, and plugins.
- Prefer concise sections with code snippets and practical rules.
- Use Mermaid only when it clarifies architecture or flow.

## Codegen Rules
- Do not write docs for removed route paths.
- Do not generate placeholder pages when source docs already exist.
- Do not include implementation claims that are not backed by code or nearby docs.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
