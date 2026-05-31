# enumOf Guideline

## Purpose
Use enum classes for categorical values that need type safety, defaults, dictionary entries, and stable API values.

## Ownership
- Define enum classes near the constant or scalar that owns the category.
- Use camelCase values that are stable API/storage values.
- Export the enum class so constants, dictionaries, UI, service, and signal can share it.
- Provide dictionary entries for each public enum value and description.

## Current Akan Patterns
- Use enums for status, role, type, mode, channel, lifecycle, and similar finite sets.
- Use boolean fields only when there are exactly two stable states and labels are obvious.
- Use string fields only when the value is open-ended or user-defined.
- Keep enum names domain-specific enough to avoid collisions.

## Codegen Rules
- Do not generate plain string unions when enum dictionary coverage is needed.
- Do not rename stored enum values casually; persisted data may depend on them.
- Do not add unused enum values just for hypothetical future UI.
- Do not mix display labels into stored enum values.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
