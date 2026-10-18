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

Version 1.1 reached Live through automatic deployment. The public Chromium / iPhone WebKit suite passed all four cases, including opening the first arch, waiting without losing progress, and restarting at its saved checkpoint. The full eight-chapter public campaign probe is pending; this section will be updated with its observed result before final delivery.

## Deployment and limits

- Render's GitHub installation includes selected access to this repository. Auto-Deploy is On Commit for main; automatic deployment was previously verified with a new-commit trigger and matching health SHA.
- Mobile WebKit emulation is not a physical iPhone Safari performance benchmark. No guaranteed 60 FPS or testing on separate cellular networks is claimed.
- Rooms and personalization are transient in one process; deployment or restart ends existing rooms.
- QA tools and screenshots under artifacts/ are ignored and are not served by production.
