# DON'T DROP HER!

**A little teamwork. A lot of heart.** A two-player online 3D cooperative adventure for desktop and mobile browsers. Each person carries one handle of the same fragile glass heart. Five original worlds, two people, and plenty of opportunities to blame gravity.

This is an independent project. It does not share source, room state, or hosting with HIPPO DUO / Toge-Game.

## Play

1. Open the game in a current Safari, Chrome, Edge, or Firefox browser.
2. Choose **Start your story**, enter your name, and choose an appearance and color. The host can add an anniversary and a private note.
3. Copy the room invitation to your partner. They can use that link or enter the six-character room code.
4. Both people choose **I'm ready**. The adventure begins after a countdown and a short chapter introduction.
5. Move together. Stand on the two glowing circles to open the cooperative arch. Golden checkpoints repair the heart and save your current run.
6. Center the heart on the pedestal and both hold Balance to place it. Both players choose the next chapter. Finish all five to reveal your personal message and celebration.

Exactly two online players are required. There is no bot or solo completion route.

| Desktop | Phone |
| --- | --- |
| WASD / arrows: move | Virtual joystick: move |
| E: grab / release | Grab button |
| Space: jump | Jump button |
| Hold Shift: stabilize / brake | Hold Balance |
| Drag mouse: orbit camera | Drag the world: orbit camera |
| Mouse wheel: zoom | Comfortable automatic camera distance |
| Escape / pause button | Pause button |

Hold Balance **together** to calm and slowly repair the heart. Jump at the same time. A partner on solid ground can help pull a briefly dangling player back when both hold Balance. Disconnecting pauses the shared game and reserves the player for two minutes. Reopen the same tab to reconnect; a new unrelated tab cannot take that identity without the private token. A valid token replaces a stale mobile socket without resetting the game. Pausing affects both players. Restarting a checkpoint and advancing chapters require both players' votes.

## Five chapters

| Chapter | Obstacles and setting |
| --- | --- |
| Love Garden | Rose arches, trees and flowers, narrow wooden bridges, moving deck, gentle slope, planters |
| Crazy Kitchen | Giant mugs and cookware, rolling pin, swinging spoon, rotating turntable, moving sponge, slippery puddles, temporarily heavy heart |
| Broken Bridge | Clouds, missing planks, wind, swaying bridges, collapsing boards, swinging bell |
| Ice of Love | Ice friction, snowballs, drifting ice, frost crystals, frozen bridges, gusts |
| Heart Castle | Lit towers, a rotating platform and trap, magic lift, pendulum, timed gate, final pedestal |

Every chapter has a cooperative gate, two checkpoints, and a finish. Obstacles are driven by the authoritative simulation clock. Collapsing boards reset on respawn. Damage depends on impact force, excessive handle tension, severe tilt, and falling; small contacts are filtered. The 70 / 40 / 15 health stages expose progressively larger cracks. A break triggers brief physics slow motion, glass shards, a funny message, and a shared respawn.

## Requirements and local development

Node.js **22.12+** or Node.js **24**, npm, and a browser with WebGL 2. Node 24 is used by CI and the Render blueprint.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Vite is mounted in the same Express server as Socket.IO. Use two browser profiles or separate devices on your network. For another device, use your computer's LAN address and permit the port through your local firewall. Production clients use the current page origin, so no localhost URL is bundled into the game.

```sh
npm test
npm run build
npm start
```

`PORT` defaults to 3000 locally. The service binds to `0.0.0.0` and uses the `PORT` that Render supplies. `/health` exposes readiness, version, and `RENDER_GIT_COMMIT` for deployment verification, without names or messages.

```sh
npx playwright install chromium webkit
npm run test:e2e
```

The browser suite uses two independent contexts, tests room creation, invitation links, readiness, movement, shared health, pause, disconnect, customization, touch controls, and responsive layout. WebKit uses an iPhone 13 viewport and touch emulation. This is not a physical iPhone hardware benchmark. The server suite also completes all five courses using only movement/grab inputs, tests reconnect reservations and room privacy, and checks that clients cannot write health or game progress.

## Architecture

- `shared/levels.js`: course geometry, palette, motion definitions, and the shared obstacle clock.
- `server/simulation.js`: Rapier world at 60 Hz, player capsules, shared heart body, force-driven handle anchors, damage, recovery, checkpoints, and finish conditions.
- `server/rooms.js`: private rooms, bounded inputs, reconnect identities, votes, state machine, and 20 Hz snapshots.
- `server/app.js`: Express, security headers, same-origin Socket.IO, static production files / Vite development middleware, and bounded fixed-step scheduling.
- `client/render/`: original modeled characters, procedural landscapes, glass, particles, animations, and adaptive graphics.
- `client/network.js`: Socket.IO transport, reconnect, 100 ms snapshot interpolation, quaternion normalization, and immediate respawn corrections.
- `client/input.js`, `camera.js`, `audio.js`, `ui.js`: independent controls, camera, original synthesized audio, and interface.

The server owns all positions, health, switches, checkpoints, and victories. Clients send only normalized movement and button intentions. No production debug, teleport, health, or level-skip endpoint exists. Reconnect tokens are cryptographically random, stored only in the player's tab session, and excluded from room broadcasts. Notes are emitted only to members of their private room; there is no public room directory or telemetry. Personalization is inserted as escaped text.

The room code is an invitation secret: anyone who knows it may occupy the second empty slot. Rooms are not durable storage; process restart or deploy ends the run. A deployment supports **one server instance** with up to 64 room reservations. Horizontal scaling would require room ownership routing and a shared adapter; it is intentionally not enabled.

## Publish to GitHub and Render

See [DEPLOYMENT.md](DEPLOYMENT.md) for exact instructions, missing-access recovery, and a public verification checklist. `render.yaml` creates a separate free Web Service in Frankfurt with one instance, automatic main-branch deploys, and `/health` checks. GitHub Actions tests, builds, and runs both browser projects on every push / pull request.

Render's free service may sleep when idle. Allow its initial wake-up time before retrying an invitation. In-memory rooms disappear on deploy/restart. Keep the service at one instance.

## Original assets and current limits

All character geometry, scenery, UI SVGs, and procedural music / effects were authored for this project. No downloaded or unlicensed character, music, or texture pack is included. Dependency licenses are listed in [ASSETS.md](ASSETS.md).

The artwork is an original stylized procedural scene; it does not include motion-captured animation or purchased character models. Character walking, carrying arms, worried faces, falls, and celebrations are procedural animations. Small glass cracks are visual line meshes rather than fracture simulation. Water waves are visual and falling into the environment causes a reset. Input interpolation smooths server updates, but there is no local rigid-body prediction; responsiveness depends on network latency. Adaptive quality lowers pixel ratio, shadows, and glass cost on slower devices. Physical iPhone performance and two cellular networks must be verified separately; do not infer a guaranteed 60 FPS from desktop tests.

## License

Original source and assets: [MIT](LICENSE). Third-party packages retain their own licenses.
