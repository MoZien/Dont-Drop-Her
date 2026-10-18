# Release verification

Updated: 2026-10-18. Local tests ran on Windows with Node 24.15.0.

## Published game

- Game: https://dont-drop-her.onrender.com
- Repository: https://github.com/MoZien/Dont-Drop-Her
- Render service: `srv-db72orc9v7es73a9kurg`, My Workspace, Frankfurt, Free, one instance.
- The control and graphics release reached **Live**. `/health` returned HTTP 200 with the same source commit as GitHub main.
- All 38 tracked source files matched the published GitHub tree by Git blob hashes. The release identity is available from `/health`; no self-referential commit ID is embedded in this report.

## Control and graphics corrections

- Right/left and forward movement follow the rendered camera, including during a smoothed orbit.
- The camera starts looking straight along the course, widens its framing for portrait phones, and can be reset with R or the camera button.
- Fixed the facial reaction scale that stretched the mouth into long vertical strips in front of both characters.
- Input transmission runs independently of rendering. Slow GPU frames no longer delay every movement packet.
- The joystick has a center dead zone and clears on cancel, lost capture, blur, and screen changes. Multiple action pointers remain independent.
- Help/settings dialogs disable movement until closed. Audio resume cannot block room or ready buttons.
- Low quality omits the extra transmission render pass. Automatic quality adapts sooner; rigid facial details share draw calls.
- A golden ring identifies the local character; the grab button shows whether it will release or grab the heart.
- A smaller phone HUD, safe-area offsets, and 16px mobile form inputs improve the space available for play and typing.

## Completed automated checks

- `npm run check`: **25 tests passed**, zero failures; production build succeeded.
- `npm run test:e2e -- --trace off`: **4 tests passed locally**.
- The same browser suite against the **public Render URL**: **4 tests passed** in Chromium desktop and iPhone 13 WebKit emulation, using independent player contexts / browser processes. No JavaScript page errors were observed.
- The public run created and joined private rooms, readied both players, rendered actual 3D geometry, moved the shared heart, synchronized durability, reset the camera, opened help, paused/resumed, and detected disconnects.
- Mobile checks covered native grab touches, joystick movement, a second pointer pressing Jump without clearing the joystick, pointer cancellation, release cleanup, and horizontal overflow.
- GitHub Actions passed tests, production build, and all four browser cases on Ubuntu / Node 24: https://github.com/MoZien/Dont-Drop-Her/actions/runs/39150835701
- New regressions check mouth bounds, portrait framing, camera direction during orbit, and a never-resolving browser audio resume promise.
- Server tests complete **all five levels using movement/grab intentions only**, including cooperative switches, both checkpoints, pedestal placement, chapter votes, victory, and replay.
- Authority checks reject client writes to health/checkpoints/completion, sanitize extreme inputs, isolate notes and reconnect tokens, reject unrelated WebSocket origins, and validate reconnect / stale mobile socket transfer.

The earlier full campaign probe over the public Render connection also completed **all five chapters**, observing **7,695 matching authoritative snapshots** between the two clients. It exercised checkpoint recovery, chapter transitions and victory. The server physics and course definitions are unchanged by this client polish release.

## Deployment behavior and evidence limits

- Auto-Deploy is configured as On Commit for `main`. The Render GitHub installation now includes selected access to `MoZien/Dont-Drop-Her`. The existing repository selection remains intact. Verify each update by matching the automatic deploy's source commit and `/health` with GitHub main; the configuration setting alone is not deployment evidence.
- WebKit mobile emulation is not a physical iPhone Safari performance benchmark. No guaranteed 60 FPS or testing on two separate cellular networks is claimed.
- Rooms and personalization are transient memory in one server process; restarting or deploying ends existing rooms.
- Screenshots and QA-only tools are ignored under `artifacts/` and are not part of the public application.
