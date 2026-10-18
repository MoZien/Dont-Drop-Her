# Version 1.1 release verification

Updated: 2026-10-18. Windows / Node 24.15.0.

Game: https://dont-drop-her.onrender.com
Source: https://github.com/MoZien/Dont-Drop-Her
Render service: `srv-db72orc9v7es73a9kurg`, My Workspace, Frankfurt, Free, one instance.

## Implemented upgrade

- Eight distinct chapters. New chapters: Clockwork Carnival, Volcano Vows, Starlight Observatory.
- Stronger garden hazards, narrower moving decks, conveyors, offset paths, timed steam vents, light gates and drifting star bridges.
- Carrying characters face travel instead of facing the camera. Turning is smoothed; feet lift and knees bend; free arms swing and the carrying arm follows the actual physical handle in character-local space.
- Decorative arches behind the players stop blocking the camera while the closed physical gate stays visible. Arch batches preserve their own world position.
- The first arch now saves checkpoint 1 of 3 immediately. Standing on the circles stabilizes the heart. Circle occupancy has hysteresis and brief interruptions retain charge. The HUD exposes both circle states, a charge meter, saved progress and red/green timing hints.
- Sustained strain accumulates fractional damage. Healing requires both carriers to rest and balance on solid ground, so holding Balance while walking through hazards does not continuously erase damage.
- Ground support respects surface tilt and the capsule's supported edge. Moving platforms carry players with their actual point velocity.
- The chapter map previews every world and difficulty. The finale records all eight chapter times and shared falls; replay clears these results.

## Completed local verification

- `npm run check`: **34 tests passed**, zero failures, production build succeeded.
- `npm run test:e2e -- --trace off`: **4 tests passed**, Chromium desktop and iPhone 13 WebKit emulation.
- Browser clients walked onto the opening circles, stopped, opened the arch, waited without losing the checkpoint, and restarted together beyond the saved gate. Both mobile and desktop covered this regression.
- All eight chapters were completed using movement/grab intentions only, without teleports or client writes to health/checkpoints.
- Dedicated regressions check forward-facing carrying poses in four directions, physical grip alignment, gait settling, fractional damage, a 30-second rest on the opening circles, safe regrouping at every arch checkpoint, and respawn at the gate checkpoint after an accident.
- All eight environments rendered in visual QA without JavaScript page errors.
- Existing room privacy, private reconnect token, stale mobile socket, hostile origin, two-player authority and replay tests passed.

## Public release verification

Version 1.1 reached **Live** through automatic deployment. The public Chromium / iPhone WebKit suite passed **all four cases** on the final client runtime, including forward-facing characters, the clear camera view, opening the arch, waiting without losing progress, and restarting at its saved checkpoint. No JavaScript page errors were observed.

The real-network campaign probe returned **PASS: all eight chapters** and **10,130 matching authoritative snapshots** between two independent clients. Each chapter finished with all three checkpoints. The probe used ordinary movement/grab intentions and had no teleport, health, progress, or level-write access.

| Chapter | Active seconds | Heart at finish | Falls / checkpoint recoveries |
| --- | ---: | ---: | ---: |
| Love Garden | 37 | 100% | 0 |
| Crazy Kitchen | 114 | 100% | 5 |
| Broken Bridge | 34 | 100% | 0 |
| Ice of Love | 29 | 100% | 0 |
| Heart Castle | 36 | 100% | 0 |
| Clockwork Carnival | 49 | 100% | 0 |
| Volcano Vows | 119 | 100% | 6 |
| Starlight Observatory | 49 | 94.8% | 0 |

GitHub Actions passed 34 automated tests, the production build, and all four browser cases for the validated runtime: https://github.com/MoZien/Dont-Drop-Her/actions/runs/39155023605

The final documentation and QA-driver normalization update does not alter the client/server runtime tested above. The QA driver now applies the same input sanitizer as the live network path; all 34 local tests also pass with this normalization. All 39 source files are checked against the published Git tree, and the public health commit is checked against main after deployment.


## Deployment and limits

- Render's GitHub installation includes selected access to this repository. Auto-Deploy is On Commit for main; automatic deployment was previously verified with a new-commit trigger and matching health SHA.
- Mobile WebKit emulation is not a physical iPhone Safari performance benchmark. No guaranteed 60 FPS or testing on separate cellular networks is claimed.
- Rooms and personalization are transient in one process; deployment or restart ends existing rooms.
- QA tools and screenshots under artifacts/ are ignored and are not served by production.
