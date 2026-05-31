# Shared UI Usage Guideline

## Purpose
Use shared UI components when building app or module UI that should stay consistent across products.

## Ownership
- Shared UI components provide reusable display, form, overlay, and layout primitives.
- Prefer documented props and local examples before inventing new wrappers.
- Shared UI should remain domain-neutral.

## Current Akan Patterns
- Import from the project shared UI entrypoints already used nearby.
- Wrap shared UI only when the module needs domain-specific labels or behavior.
- Preserve accessibility and theming assumptions from the shared component.

## Codegen Rules
- Do not copy shared UI internals into module files.
- Do not pass unsupported props.
- Do not make shared UI depend on one app domain.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
