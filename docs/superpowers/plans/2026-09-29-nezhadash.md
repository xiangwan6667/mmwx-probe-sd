# NezhaDash original-source port

The user rejected the initial approximation and required original upstream code
and appearance. This plan supersedes the earlier rewritten-component approach.

## Implementation

- Vendor upstream 2.4.3 components/styles/translations with Apache attribution.
- Preserve original layout, cards/list, illustration, map, search and detail charts.
- Mount as a Vite second entry in a same-origin iframe for Tailwind isolation.
- Bridge the existing public payload; no second WebSocket or backend changes.
- Adapt only data/API/routing/auth/theme integration. Chinese UI, English identifiers.
- Keep timestamp, missing-data, boot traffic and retention semantics explicit.

## Verification

Adapter regression tests cover indices, byte units, zero values, offline status,
seconds-to-milliseconds conversion and complete packet loss. Run full tests,
TypeScript and production build before delivery. Browser checks cover original
light/dark views, mobile width, detail links, history and theme switching.
Low-reasoning review covers the adapter and multi-entry deployment integration.
Deliver with the established emoji + Chinese commit style to origin/main.
