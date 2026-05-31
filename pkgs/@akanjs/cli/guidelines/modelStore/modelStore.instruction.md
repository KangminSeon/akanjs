# model.store.ts Guideline

## Purpose
Generate client state coordination for a module. Store connects generated fetch calls to form state, list state, detail state, toast messages, and UI-facing actions.

## Ownership
- Create the store with the current `stateOf(fetch.model, customState)` pattern used by nearby modules.
- Use generated `st.use.*` selectors in UI and generated `st.do.*` actions for state changes.
- Keep temporary UI state, selected IDs, query args, and form state in store when shared across components.
- Call generated fetch endpoints from store actions rather than directly inside presentation components.

## Current Akan Patterns
- Use store actions for submit, refresh, pagination, filter changes, dialog-confirmed actions, and optimistic UI updates.
- Use generated field setters for Template form inputs where available.
- Keep server invariants in service; store should coordinate user interaction and client state.
- Use user-facing messages consistently with dictionary terms.

## Codegen Rules
- Do not duplicate server data shape as independent client interfaces.
- Do not store derived values that can be computed cheaply from existing state.
- Do not perform persistence logic in React components when a store action can own it.
- Do not call private or internal signal operations from UI state.

## Review Checklist
- The instruction points to current docs pages, not removed docs routes.
- Generated examples use current Akan builder APIs and scanner-friendly filenames.
- The output contract tells the model which file paths to return.
- The guide avoids broad framework essays when a concrete file rule is better.
