# Akan Component Rule Guideline

## Purpose
Use this for shared UI rules across module, scalar, app UI, and docs components.

## Ownership
- Accept `className?: string` for reusable components and forward it through `clsx`.
- Use semantic HTML and accessible labels for interactive elements.
- Use `akanjs/ui` and project UI libraries before adding new primitives.
- Keep presentation components small; move page composition to Zone and actions to Util or store.

## Current Akan Patterns
- Unit renders compact repeated display, View renders full detail display, Template renders form fragments, Util renders small controls, Zone composes page sections.
- Server components should stay display-only unless the file convention says otherwise.
- Client components can use store hooks and event handlers where interaction is required.
- Use generated model types from app client or module constants; do not invent duplicate UI-only model shapes.

## Codegen Rules
- Do not put business workflow decisions in render code.
- Do not use undocumented UI components or props.
- Do not use hardcoded colors when DaisyUI semantic classes work.
- Do not create broad component abstractions before repeated patterns exist.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
