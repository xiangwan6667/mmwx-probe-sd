# NezhaDash third-party attribution

This project vendors the original React components, hooks, translations and styles
from [hamster1963/nezha-dash-v2](https://github.com/hamster1963/nezha-dash-v2),
revision `cd070d57dac800fb7a6a6e119a7db35066587149` (version 2.4.3), under
`src/nezhadash/upstream/`. Upstream authors and contributors retain their rights.
The original Apache License 2.0 is included in `NezhaDash-Apache-2.0.txt`.
`NezhaDash-upstream-files.json` records the upstream SHA-256 of every copied source.
The original animated illustration and icon are also copied to `public/nezhadash/`.

Card surface, hover, overview border styles and `components/TrafficBar.tsx` are adapted from
[BITJEBE/nezha-BITJEBE](https://github.com/BITJEBE/nezha-BITJEBE), revision
`88a9a07d5f60441b01440062474d0cc5339bc08a`, under the same Apache License 2.0.
The existing MMWX data adapters and missing-measurement handling are retained;
the overview illustration is no longer rendered. The traffic bar uses MMWX billable
usage, quota, billing mode and explicit period end rather than boot counters or an
assumed monthly reset. Missing usage stays unknown and expired periods are not
silently rolled forward. BITJEBE's original traffic bar layout and colors are retained.

`components/PlanInfo.tsx`, `components/VisitorCapsuleBar.tsx`, and the capsule
palette in `lib/theme-colors.ts` are also adapted from that BITJEBE revision.
Plan tags use public MMWX quota and return-route fields; unavailable IP-family
flags are omitted. Billing uses the original Nezha component with explicit expiry
and no automatic renewal; its progress estimates the current renewal cycle.
The visitor capsule preserves the original appearance and timed display, but
reads only `/api/visitor` (Cloudflare request metadata) and bundled country flags
instead of external IP lookup and flag services. Mobile sizing and safe-area
spacing are adapted for long IPv6 addresses.

Modifications by xiangwan6667, September 2026:

- Mount the original application in a same-origin document to isolate its Tailwind
  stylesheet. Reuse the host data stream through a checked message bridge.
- Adapt MMWX public payload, groups, settings and public latency/connection history
  to the original Nezha data shapes. Preserve array indices, byte units, missing
  latency buckets and packet-loss samples; convert timestamps to milliseconds.
- Use HashRouter and synchronize detail links with the host. Show NotFound for
  removed nodes. Direct child-document visits return to the host.
- Default to Chinese; connect the original header to the host theme dropdown,
  system color preference and Passkey login. Keep the original layout and visuals.
- Default color mode to the system preference and synchronize embedded theme
  colors with the host, including when a suspended page becomes visible again.
- Share theme-aware scrollbar styling between the host and theme document,
  including dropdown menus, while retaining intentionally hidden scrollbars.
- Configure the original desktop/mobile background layers through public Worker
  settings; initialize them before mount and remove the background polling loop.
- Add conditional glass surfaces for cards, controls and portalled menus when a
  custom background is present. Replace obsolete opacity utilities that removed
  the view-toggle background colors; retain their selected-state colors.
- Respect the host history retention range and show only available resource charts.
  Do not invent process counts or historical CPU/memory data absent from MMWX.
- Use local flag/font styles and original asset paths, retain host attribution,
  and display unavailable measurements as dashes where adapted.

Modified upstream files (each also carries a modification notice):

- `App.tsx`
- `i18n.js`
- `index.css`
- `components/Footer.tsx`
- `components/Header.tsx` (host integration; remove the header subtitle and divider)
- `components/billingInfo.tsx`
- `components/PlanInfo.tsx` (BITJEBE colored tag implementation)
- `components/NetworkChart.tsx`
- `components/ServerCard.tsx`
- `components/ServerCardInline.tsx`
- `components/ServerDetailChart.tsx`
- `components/ServerDetailOverview.tsx` (host data; accessible return-to-list button independent of browser history)
- `components/ServerOverview.tsx`
- `components/TrafficBar.tsx`
- `components/VisitorCapsuleBar.tsx`
- `components/GroupSwitch.tsx`, `components/TabSwitch.tsx`, `components/SearchButton.tsx` (glass controls)
- `components/ui/dropdown-menu.tsx`, `components/ui/popover.tsx`, `components/ui/dialog.tsx`, `components/ui/select.tsx` (glass portals)
- `components/ui/card.tsx`
- `components/ui/chart.tsx` (suppress pointer focus frames while retaining keyboard focus and tooltips)
- `components/ThemeProvider.tsx`
- `components/ThemeColorManager.tsx` (resolve system colors through the host document)
- `components/ThemeSwitcher.tsx`
- `hooks/use-background.ts` (runtime initialization and event-based updates)
- `lib/nezha-api.ts`
- `lib/utils.ts`
- `lib/theme-colors.ts` (BITJEBE capsule palette)
- `pages/Server.tsx` (replace native sorting select with anchored theme menu)
- `pages/ServerDetail.tsx`
- `types/nezha-api.ts`

All other copied source files remain unchanged apart from possible line endings.
This is an unofficial port, not endorsed by the NezhaDash authors. The host
project's existing `LICENSE` remains in force for MMWX-derived code; this notice
does not relicense the host application under Apache-2.0.
