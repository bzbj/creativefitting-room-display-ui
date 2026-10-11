# 09 换一个好问题

Selected by the owner2026-10-11 and adapted from the approved portrait concept. The live HK1 page uses real read-only room data, not the concept's simulated booking controls.

At provisional602×962 CSS px, the booking core occupies580px and the question card382px. The Dotted-i wordmark, large semantic status panel and next time range retain the concept's hierarchy. The complete canvas scales uniformly to fit the visible viewport. Long room names reduce type size and may wrap inside their reserved row.

Current booking: red 已预约 with expected end time. Next future booking: start/end range plus today/tomorrow/date. No future bookings: 暂无预约. Soon: amber countdown within10 minutes. Missing, stale, disabled or failed source: gray 状态未知, with no stale time range. Expired Hub authentication requests a new Feishu login. Bookings display 已预约; personal metadata is not displayed.

Four short questions are bundled in src/app.js and rendered as plain text. The arrow cycles one question; ordinary clock/API updates preserve it. No model/API request is involved. The question text and button retain their position in every state. Preview source=demo snapshots are visibly labelled.

| Synthetic browser preview | Screenshot |
| --- | --- |
| Free, no booking | [available](question-card-previews/available.png) |
| Free, next booking | [next](question-card-previews/next.png) |
| Current booking | [busy](question-card-previews/busy.png) |
| Starting soon | [soon](question-card-previews/soon.png) |
| Sync failed / unknown | [unknown](question-card-previews/unknown.png) |
| Long room name | [long](question-card-previews/long.png) |

These screenshots use provisional602×962 / DPR1.33 desktop emulation. Actual portrait Acer/Fully dimensions and wall-distance reading remain physical acceptance checks. See acer-display-design-spec.md.

Build dist/hub.html for HK1 /rooms/ and /rooms/api; dist/index.html retains the legacy API prefix. The shared Feishu gate and private reader mappings are managed by the lisahost owner, never by this public repository. New deployments target HK1; the old CA1 page is not overwritten by this release.
