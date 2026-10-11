# 09 换一个好问题

Selected by the owner 2026-10-11 and adapted from the approved portrait concept. The live HK1 page uses real read-only room data, not the concept's simulated booking controls.

At provisional 602×962 CSS px, the booking core occupies 580px and the question card 382px. The entire upper booking core is a solid state color, about 2.8× the former inset panel area. The approved blue Dotted-i wordmark sits on white; room, clock, status and next time range use white type. Available is 132px, occupied 114px, soon/unknown 100px before viewport scaling. The complete canvas scales uniformly to fit the visible viewport. Long room names reduce type size and may wrap inside their reserved row.

Current booking: red 占用中 with expected end time. Next future booking: start/end range plus today/tomorrow/date. No future bookings: 暂无预约. Soon: amber countdown within 10 minutes. Missing, stale, disabled or failed source: gray 状态未知, with no stale time range. Expired Hub authentication requests a new Feishu login. Bookings display 已预约; personal metadata is not displayed.

100 original short prompts and reflections are bundled in src/app.js and rendered as plain text, inspired by the experience of drawing a line from an answer book. They are original copy, not excerpts from a published book. On load and every 30 seconds the card draws from a shuffled bag; every prompt appears once per cycle, with no immediate repeat between cycles. The arrow draws immediately and resets the 30-second reading time. Ordinary clock/API updates preserve it. There is no visible index, total or progress indicator. No model/API request is involved. The question text and button retain their position in every state. Preview source=demo snapshots are visibly labelled.

| Synthetic browser preview | Screenshot |
| --- | --- |
| Free, no booking | [available](question-card-previews/available.png) |
| Free, next booking | [next](question-card-previews/next.png) |
| Current booking | [busy](question-card-previews/busy.png) |
| Starting soon | [soon](question-card-previews/soon.png) |
| Sync failed / unknown | [unknown](question-card-previews/unknown.png) |
| Long room name | [long](question-card-previews/long.png) |

These screenshots use provisional 602×962 / DPR1.33 desktop emulation. Actual portrait Acer/Fully dimensions and wall-distance reading remain physical acceptance checks. See acer-display-design-spec.md.

Build dist/hub.html for HK1 /rooms/ and /rooms/api; dist/index.html retains the legacy API prefix. The shared Feishu gate and private reader mappings are managed by the lisahost owner, never by this public repository. New deployments target HK1; the old CA1 page is not overwritten by this release.
