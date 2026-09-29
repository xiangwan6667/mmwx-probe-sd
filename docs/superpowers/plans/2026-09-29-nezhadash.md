# NezhaDash Implementation Plan

> **For agentic workers:** Use executing-plans to implement the approved scope below.

**Goal:** Port NezhaDash's compact monitoring dashboard into a selectable theme.

**Architecture:** A lazy React page consumes the existing ProbePayload. Pure helpers filter and sort nodes while retaining their original API indices. App supplies existing detail content within its history context; scoped theme tokens style the page and portals.

**Tech Stack:** React 19, TypeScript, CSS, existing Lucide icons and probe components.

**Spec:** User-approved overview, cards/list, filtering/sorting, details, mobile, light/dark/system, theme dropdown, upstream attribution. Display Chinese UI; keep English internal values and the NezhaDash brand.

## Constraints and review focus

- No extra polling, backend changes, or new dependencies.
- Preserve original server indices after filtering/sorting, missing values versus zero, traffic billing semantics, history-day limits and license badge.
- Validate empty/missing data, invalid deep links, keyboard navigation, mobile overflow and theme switching.

## Tasks

- [x] Add helper regression tests for filtering/sorting/index identity and missing data; run failing tests, implement, rerun.
- [x] Build NezhaDash overview, search, region/status filters, sorting, card/list modes and routed details; integrate theme selection.
- [x] Add scoped responsive palettes, retain host functions and attribution, document source/license.
- [x] Run tests, typecheck and production build; exercise browser desktop/mobile, light/dark, navigation and filters.
- [x] Request low-reasoning code review and resolve actionable findings. Delivery uses the established emoji + Chinese commit style.

## Verification results

Ten test files pass, TypeScript checks and production build pass. Existing Lottie eval and bundle-size warnings remain. Browser checks use local fixture nodes: desktop light/dark, 375px layout, compact theme menu, system preference selection, reload persistence, search, sorting, list/card view and routed details/history entry. No production data or credentials were used.
