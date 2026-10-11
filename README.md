# CreativeFitting meeting-room display UI

This is the frontend for the read-only [meeting-room door display](https://hub-test.linjunkai.com/rooms/). The Acer Android tablet must now be mounted in portrait and runs Fully Kiosk Browser. The Hub page requires the existing Feishu sign-in. The repository has **no Feishu login or backend credentials**; local development uses generated fictional room schedules.

## Start designing

Python 3.10+ is enough to build and preview. Node.js is only used for a JavaScript syntax check.

**Design canvas:** use **602×962 CSS px provisionally** for first-pass portrait mockups. This estimate rotates the previously measured Fully landscape viewport (962×602 CSS px, DPR 1.33); the tablet's portrait Fully viewport still needs an on-device measurement. Do not call the estimate a verified acceptance size. See the [Acer display design specification](docs/acer-display-design-spec.md) for the portrait hierarchy, measurement notes, all-state checklist and on-device acceptance criteria.

```sh
python3 scripts/dev_server.py
```

Open <http://127.0.0.1:8767/preview/>. It links to six live mock states: empty/available, later bookings, currently busy, starting soon, sync failure, and a long room name. Their times are regenerated on each API request, so the screen stays useful while you work. They all use `source=demo` and do not touch Feishu. Stop the server with Ctrl-C.

To make the deployable single-file page:

```sh
python3 scripts/build.py
python3 -m unittest discover -s tests -v
node --check src/app.js
node --test tests/test_room_selection.cjs
```

The current HK1 artifact is `dist/hub.html`, using the same-origin `/rooms/api/room/N` route. `dist/index.html` preserves the former `/meeting-room-display/api/room/N` prefix for compatibility. It selects a stable room number from `?room=N` and reads the corresponding same-origin `/meeting-room-display/api/room/N` route; the existing bare URL defaults to room 1. It contains the Dotted-i wordmark and fonts and does not upload device geometry. `dist/local.html` is a separate artifact for optional Mac development at `/room/1`; it uses `/api` and reports device geometry for Acer checks. The preview pages in `dist/preview/` are for design review only and must not be deployed.

Each meeting room can have its own Fully tablet and fixed Start URL, such as `https://hub-test.linjunkai.com/rooms/?room=1` or `?room=2`. Invalid or unconfigured selections show unknown and never fall back to a different room. The backend has no hardcoded two-room limit; new rooms require private configuration before activation. Only room 1 is currently activated. See [multi-room setup](docs/multi-room-setup.md) for installation and designer conventions.

## Where to edit

| File | Purpose |
| --- | --- |
| `src/index.template.html` | Door-sign structure and labels |
| `src/styles.css` | Layout, type sizes, colors and orientation-specific responsive rules |
| `src/app.js` | Clock, busy-state rendering, refresh and stale-data behavior |
| `assets/` | Dotted-i wordmark, Nunito/Quicksand WOFF2 fonts and OFL licenses |
| `scripts/build.py` | Produces production and preview single-file HTML |
| `scripts/mock_data.py` | Synthetic preview states; no company schedule data |
| `scripts/dev_server.py` | Loopback-only preview server |

The public API returns a snapshot shaped like this; dates below are examples only:

```json
{
  "source": "feishu",
  "fresh": true,
  "max_age_seconds": 630,
  "room": {"name": "示例会议室", "capacity": 6, "enabled": true},
  "fetched_at": "2026-09-29T09:00:00+08:00",
  "last_attempt_at": "2026-09-29T09:00:00+08:00",
  "error": null,
  "events": [{"start": "2026-09-29T10:00:00+08:00", "end": "2026-09-29T11:00:00+08:00"}]
}
```

Only a fresh snapshot with an enabled room may show “空闲” or “占用中”. If fetching fails, `fresh=false`, or `fetched_at` ages beyond `max_age_seconds`, show “状态未知 / 请查看飞书”. Booking rows currently display “已预约”; the public JSON contains times only, with no organizer names, meeting titles, internal IDs or calendar links. Design the page so the room, status and next booking are readable at a distance and fit without scrolling at the measured Fully viewport.

## Collaborate and release

This repository is public. Teammates can fork it and open pull requests without an invitation; teammates with write access can create branches here directly. Include portrait screenshots of the relevant states at the provisional 602×962 CSS-pixel canvas, labelled as an estimate until measured on the tablet. Review empty, busy, soon, unknown and long-name layouts. See [CONTRIBUTING.md](CONTRIBUTING.md) for the handoff checklist.

The `main` branch is the UI source for future releases. A merge does not automatically change the live door sign. The current deployment target is HK1 at `https://hub-test.linjunkai.com/rooms/` during migration; its Feishu authentication and room permissions remain in the shared server gateway. The deployment owner builds the selected commit, backs up and atomically replaces only `/var/www/cf-hub/display/rooms/index.html` with `dist/hub.html`, then verifies the page, read-only API, authentication and service health. The five-minute JSON reader runs independently on HK1; frontend polling stays15 seconds. The temporary hostname currently transits CA1 to reach HK1. Legacy CA1 routes are kept until a separate cutover; new UI publication targets HK1. Operational receipts record the source commit and artifact hash.

The selected production layout is [09 换一个好问题](docs/question-card-design.md): a stable booking area above a pale yellow question card. The entire upper booking area turns green, red, amber or slate with large white status text. 100 original bundled answer-book prompts draw randomly on load and every 30 seconds; tapping the arrow draws immediately and resets the reading time. No index or total is shown, and each cycle avoids repeats. No network or AI calls are involved. The full portrait canvas fits the available viewport without scrolling. State boundaries and data expiry are checked every second even if a fetch stalls; a ten-second request timeout and15-second polling allow later recovery.

The CreativeFitting wordmark is company branding. Nunito and Quicksand retain their bundled SIL Open Font License texts in `assets/`. Public visibility allows viewing and proposing changes; no general open-source license is granted for the UI or brand artwork.


## Room content Studio (submissions and previews only)

The authenticated [Studio](https://hub-test.linjunkai.com/rooms/studio/) accepts one HTML/image/video file and stores a shareable company preview. It does not publish to the live meeting screen. Its [online guide](https://hub-test.linjunkai.com/rooms/studio/guide/) and [developer handoff](docs/room-content-studio.md) describe the provisional602×382 lower area, touch rules and template. `src/studio/` owns the Studio UI, portrait shell and starter; `dist/studio/` is deployed separately on HK1. The live display artifact stays unchanged.

After starting the local dev server, open <http://127.0.0.1:8767/rooms/studio/>. Select a local file to preview within the Pad shell and switch meeting states. Local preview does not persist submissions; online saves use the private HK1 service and scoped company Feishu identity. Run `node --check src/studio/app.js` and `node --check src/studio/shell.js` in addition to the normal build/tests. Backend/auth/service files belong to the lisahost owner, outside this public repository.

Studio also accepts email submissions to jacky.lin@opengrove.io using `[会议屏投稿] 作品名称 - 作者署名`. Attach one work and include a short description and touch instructions. The mail draft link pre-fills the subject/body; the sender adds attachments. Email submissions are handled by the administrator; immediate saved previews use the web form.
