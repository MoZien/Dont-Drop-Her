# Asset provenance

| Asset | Origin / license |
| --- | --- |
| Oliver and Juniper character models, hair, clothes, facial parts and animation | Original source in `client/render/models.js`; MIT |
| Glass heart mesh, handles, visual cracks and particles | Original source in `client/render/`; MIT |
| All five environments, props, trees, flowers, ice and castle | Original procedural geometry in `client/render/environment.js`; MIT |
| Music, heartbeat, glass, movement, wind, water and celebration audio | Original Web Audio synthesis in `client/audio.js`; MIT |
| UI icons, favicon, layout and styling | Original SVG paths and CSS; MIT |
| Font rendering | User's system fonts; no redistributed font file |
| Three.js and its RoomEnvironment / RoundedBoxGeometry addons | MIT, distributed through the `three` package |
| Rapier 3D | Apache-2.0, distributed through `@dimforge/rapier3d-compat` |
| Express, Helmet, Socket.IO, Vite | Their package licenses, recorded in installed packages and npm lockfile |
| Playwright | Apache-2.0; development/test dependency only |

No external image, texture, stock music, character model, or emoji character asset is embedded in the game. Runtime assets are bundled locally; there is no required CDN or third-party font request.
