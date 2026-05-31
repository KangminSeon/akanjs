# CSS Rule Guideline

## Purpose
Use TailwindCSS and DaisyUI in a theme-safe, composable way for Akan UI and docs pages.

## Ownership
- Use Tailwind utility classes for layout, spacing, typography, and responsive behavior.
- Use DaisyUI semantic tokens such as base, primary, secondary, accent, info, success, warning, and error.
- Use `clsx` from `akanjs/client` for conditional class composition.
- Forward `className` at the end of composed class strings to allow callers to extend styles.

## Current Akan Patterns
- Prefer mobile-first responsive classes.
- Use card, btn, input, badge, alert, divider, tabs, modal, and other documented DaisyUI classes when they match the design.
- Use consistent density and spacing within one component family.
- Keep custom CSS files rare and scoped to cases utilities cannot express cleanly.

## Codegen Rules
- Do not hardcode hex colors or one-off brand colors unless the existing file already defines that design system.
- Do not use important flags to fight component composition.
- Do not hide focus states on interactive elements.
- Do not add global CSS for one component-specific layout.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
