# Docs To Guideline Sync Rule

## Purpose
Use this when applying current docs page information back into guideline instruction files.

## Ownership
- Docs pages are the source of truth for product-facing explanations.
- Guideline instructions are compressed operational rules for AI codegen.
- Sync should preserve codegen-specific output contracts and validation rules that docs pages may not mention.

## Current Akan Patterns
- Extract ownership boundaries, API names, file paths, examples, and warnings from docs pages.
- Convert long explanatory sections into prompt-friendly bullet rules.
- Keep docs links or source paths in `generate.json` metadata.

## Codegen Rules
- Do not copy large TSX page content directly into markdown instructions.
- Do not remove codegen output format requirements during sync.
- Do not let stale instruction examples override newer docs examples.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
