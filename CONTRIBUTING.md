# Contributing to the door display

1. Fork the public repository and create a short-lived branch, or create a branch here if you have write access. Keep a change focused on UI behavior or visual design; open a pull request for review rather than pushing straight to `main`.
2. Run the build, Python checks and JavaScript syntax check from the README. Preview all six synthetic states at the measured Fully **962×602 CSS px** canvas and the ordinary-browser **962×425 CSS px** fallback, using the [Acer design specification](docs/acer-landscape-design-spec.md). Include screenshots for states and viewports affected by your change.
3. Keep the large room name, current state and next booking legible from a wall. At both target landscape sizes, avoid horizontal or vertical overflow. Preserve explicit text for status; color alone is insufficient.
4. Keep fail-closed behavior: an unavailable or stale data source is “状态未知”. Only display “已预约” for bookings. Do not introduce meeting titles, organizer identities, IDs, Feishu credentials, live schedules, remote analytics or external runtime assets.
5. If you change the DOM used by the original Acer geometry checker, note it in the pull request so the deployment maintainer can update that checker. The Acer/Fully viewport is now measured; add a new actual-device screenshot to the review when changing visible layout. The original Mac-only geometry checker cannot read the tablet while it is on another network.

The merged UI is released separately by the CA1 deployment maintainer after an on-device check. This avoids an unreviewed design change unexpectedly replacing the wall-mounted sign.
