# CreativeFitting meeting-room display UI

This is the frontend for the read-only [meeting-room door display](https://lab.linjunkai.com/meeting-room-display/). It is a plain, self-contained HTML page designed for a landscape Acer Android tablet running Fully Kiosk Browser. The repository has **no Feishu login or backend credentials**; local development uses generated fictional room schedules.

## Start designing

Python 3.10+ is enough to build and preview. Node.js is only used for a JavaScript syntax check.

```sh
python3 scripts/dev_server.py
```

Open <http://127.0.0.1:8767/preview/>. It links to six live mock states: empty/available, later bookings, currently busy, starting soon, sync failure, and a long room name. Their times are regenerated on each API request, so the screen stays useful while you work. They all use `source=demo` and do not touch Feishu. Stop the server with Ctrl-C.

To make the deployable single-file page:

```sh
python3 scripts/build.py
python3 -m unittest discover -s tests -v
node --check src/app.js
```

The production artifact is `dist/index.html`. It points to the read-only same-origin `/meeting-room-display/api/room/1` route, contains the Dotted-i wordmark and fonts, and does not upload device geometry. `dist/local.html` is a separate artifact for the existing Mac trial service at `/room/1`; it uses `/api` and reports device geometry for Acer checks. The preview pages in `dist/preview/` are for design review only and must not be deployed.

## Where to edit

| File | Purpose |
| --- | --- |
| `src/index.template.html` | Door-sign structure and labels |
| `src/styles.css` | Layout, type sizes, colors and small-landscape rules |
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

Only a fresh snapshot with an enabled room may show “空闲” or “使用中”. If fetching fails, `fresh=false`, or `fetched_at` ages beyond `max_age_seconds`, show “状态未知 / 请查看飞书”. Booking rows currently display “已预约”; the public JSON contains times only, with no organizer names, meeting titles, internal IDs or calendar links. Design the page so the room, status and next booking are readable at a distance and fit without scrolling. The Acer's ordinary browser measured **962×425 CSS px**, DPR about 1.331, Android 14 WebView/Chrome 113. Fully's true fullscreen viewport still needs on-device measurement.

## Collaborate and release

This repository is public. Teammates can fork it and open pull requests without an invitation; teammates with write access can create branches here directly. Include screenshots of the relevant states at 962×425 CSS px. Review empty, busy, soon, unknown and long-name layouts. See [CONTRIBUTING.md](CONTRIBUTING.md) for the handoff checklist.

The `main` branch is the UI source for future releases. A merge **does not automatically change the live door sign**. After review, the deployment maintainer builds the selected commit, copies only `dist/index.html` into the Lab portal's `/meeting-room-display/` static route, runs Lab's site checks, backs up and replaces the CA1 page, and verifies the live JSON and tablet. The parent Mac trial service can be refreshed from the same commit using its `tools/build_live_page.py` wrapper, which copies `dist/local.html`. The JSON publisher is a separate lisahost/Mac service and is not in this repository. The current live page matches the initial production build byte-for-byte.

The CreativeFitting wordmark is company branding. Nunito and Quicksand retain their bundled SIL Open Font License texts in `assets/`. Public visibility allows viewing and proposing changes; no general open-source license is granted for the UI or brand artwork.
