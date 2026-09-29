# NezhaDash third-party attribution

This project vendors the original React components, hooks, translations and styles
from [hamster1963/nezha-dash-v2](https://github.com/hamster1963/nezha-dash-v2),
revision `cd070d57dac800fb7a6a6e119a7db35066587149` (version 2.4.3), under
`src/nezhadash/upstream/`. Upstream authors and contributors retain their rights.
The original Apache License 2.0 is included in `NezhaDash-Apache-2.0.txt`.
`NezhaDash-upstream-files.json` records the upstream SHA-256 of every copied source.
The original animated illustration and icon are also copied to `public/nezhadash/`.

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
- Respect the host history retention range and show only available resource charts.
  Do not invent process counts or historical CPU/memory data absent from MMWX.
- Use local flag/font styles and original asset paths, retain host attribution,
  and display unavailable measurements as dashes where adapted.

Modified upstream files (each also carries a modification notice):

- `App.tsx`
- `i18n.js`
- `index.css`
- `components/Footer.tsx`
- `components/Header.tsx`
- `components/NetworkChart.tsx`
- `components/ServerCard.tsx`
- `components/ServerCardInline.tsx`
- `components/ServerDetailChart.tsx`
- `components/ServerDetailOverview.tsx`
- `components/ServerOverview.tsx`
- `components/ThemeProvider.tsx`
- `components/ThemeSwitcher.tsx`
- `lib/nezha-api.ts`
- `lib/utils.ts`
- `pages/ServerDetail.tsx`
- `types/nezha-api.ts`

All other copied source files remain unchanged apart from possible line endings.
This is an unofficial port, not endorsed by the NezhaDash authors. The host
project's existing `LICENSE` remains in force for MMWX-derived code; this notice
does not relicense the host application under Apache-2.0.
