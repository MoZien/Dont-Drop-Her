# Release verification

Date: 2026-10-13. Tests ran on Windows with Node 24.15.0.

## Completed local checks

- `npm run check`: **20 tests passed**, zero failures; production build succeeded.
- `npm run test:e2e`: **4 tests passed** (Chromium desktop and iPhone 13 WebKit emulation).
- The browser run used independent player contexts / browser processes, created and joined private rooms, readied both players, moved the shared heart, synchronized durability, paused/resumed, and detected disconnects.
- Mobile verification covered layout, native grab touches, joystick-driven movement, a second pointer pressing Jump without clearing the joystick, and pointer release cleanup.
- The server tests completed **all five levels using only movement/grab intentions**, including cooperative switches, both checkpoints, placement, chapter votes, victory, and replay.
- Authority checks rejected direct client writes to health/checkpoints/completion, sanitized extreme inputs, kept notes and reconnect tokens private, rejected unrelated WebSocket origins, and validated reconnect / stale mobile socket transfer.
- All five environments rendered during an isolated visual QA pass with no JavaScript page errors. Original character models, scenery, high-quality lighting, and visible heart cracks were inspected. QA-only gallery and screenshots are ignored under `artifacts/` and are not part of the public application.

The initial Chromium software-rendering test needed separate browser processes and a longer movement polling window. The final combined run passed all four cases. Passive canvas markers verify that actual 3D geometry is drawn, so an HTML HUD over an empty canvas cannot satisfy the rendering check.

## External release

GitHub repository created and verified in the authenticated browser:
`https://github.com/MoZien/Dont-Drop-Her`

Source upload and Render deployment are in progress. This file will be updated with actual deployment evidence before final handoff. No live deployment is claimed at this stage.

## Limits of the evidence

- WebKit mobile emulation is not a physical iPhone Safari performance benchmark.
- No claim of a guaranteed 60 FPS or testing on two separate cellular networks is made.
- Browser networking tests use separate clients on one test host; a final two-phone check should be done on the actual devices.
- Render uses one process. Rooms and personalization are transient memory, and restart/deploy ends existing rooms.
