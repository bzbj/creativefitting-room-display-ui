# Contributing to the door display

1. Fork the public repository and create a short-lived branch, or create a branch here if you have write access. Keep a change focused on UI behavior or visual design; open a pull request for review rather than pushing straight to `main`.
2. Run the build, Python checks and JavaScript syntax check from the README. Preview all six synthetic states at the measured 962×425 CSS-pixel baseline. Include screenshots for states and viewports affected by your change.
3. Keep the large room name, current state and next booking legible from a wall. At the target landscape size, avoid horizontal or vertical overflow. Preserve explicit text for status; color alone is insufficient.
4. Keep fail-closed behavior: an unavailable or stale data source is “状态未知”. Only display “已预约” for bookings. Do not introduce meeting titles, organizer identities, IDs, Feishu credentials, live schedules, remote analytics or external runtime assets.
5. If you change the DOM used by the original Acer geometry checker, note it in the pull request so the deployment maintainer can update that checker. When Fully is installed, add actual device screenshots and CSS viewport measurements to the review.

The merged UI is released separately by the CA1 deployment maintainer after an on-device check. This avoids an unreviewed design change unexpectedly replacing the wall-mounted sign.
