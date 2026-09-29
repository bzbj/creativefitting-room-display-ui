# Project instructions

This repository owns only the CreativeFitting meeting-room door display UI. Keep the page usable as a self-contained HTML build with no runtime CDN or framework dependency. `dist/index.html` is the deployment artifact; the `dist/preview/` pages and `/mock/*` responses are local design fixtures only.

The current public data contract contains room name, capacity, enabled/fresh flags, fetch time and busy start/end intervals. Never add Feishu credentials, real booking records, meeting titles, internal IDs or personal names to this repository or its fixtures. Bookings currently read “已预约”. A failed, disabled or stale response must show “状态未知”, never green availability.

Target a landscape Acer Android WebView. The measured ordinary-browser baseline is 962×425 CSS pixels; Fully Kiosk Browser's immersive viewport must still be measured on the actual tablet. Keep the room name, current status and next booking readable from a wall-mounted viewing distance, and avoid vertical scrolling at the baseline. Retain the Dotted-i brand wordmark and bundled font licenses.

Before proposing a UI change, run `python3 scripts/build.py`, `python3 -m unittest discover -s tests -v`, and `node --check src/app.js`. Review all six preview states, including stale data and a long room name. Include screenshots at 962×425 CSS pixels with a pull request. Merging does not auto-deploy to CA1; coordinate a reviewed release with the deployment owner.
