# Project instructions

This repository owns only the CreativeFitting meeting-room door display UI. Keep the page usable as a self-contained HTML build with no runtime CDN or framework dependency. `dist/index.html` is the CA1 deployment artifact, `dist/local.html` feeds the Mac Acer trial service, and the `dist/preview/` pages and `/mock/*` responses are local design fixtures only.

The current public data contract contains room name, capacity, enabled/fresh flags, fetch time and busy start/end intervals. Never add Feishu credentials, real booking records, meeting titles, internal IDs or personal names to this repository or its fixtures. Bookings currently read “已预约”. A failed, disabled or stale response must show “状态未知”, never green availability.

The Acer A312-2W must now be mounted in portrait. Fully's portrait fullscreen viewport has not yet been remeasured. Use **602×962 CSS pixels provisionally** for first-pass mocks, based on rotating the measured landscape viewport; do not describe this estimate as a real-device measurement. Follow [the Acer display design specification](docs/acer-display-design-spec.md), use a single-column information hierarchy, and avoid scrolling or clipped content. Retain the Dotted-i brand wordmark and bundled font licenses.

Before proposing a UI change, run `python3 scripts/build.py`, `python3 -m unittest discover -s tests -v`, and `node --check src/app.js`. Review all six preview states, including stale data and a long room name. Include portrait screenshots at the provisional 602×962 CSS-pixel canvas with a pull request, and clearly label that canvas as an estimate until the tablet is remeasured. Merging does not auto-deploy to CA1; coordinate a reviewed release with the deployment owner.
