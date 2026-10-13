# Midtown / After Hours

A playable, entirely procedural Three.js arcade city prototype for desktop keyboard and mouse. Manhattan-inspired rather than a geographic reconstruction. No external models, textures, fonts, or audio. Three.js is the only runtime dependency; Vite builds and serves the project.

## Run

```sh
npm install
npm run dev -- --port 5173
```

Open http://localhost:5173 and select **Enter the city**. Chrome/Edge recommended for pointer lock. If the embedded browser rejects mouse capture, hold a mouse button and drag to look. Escape pauses; H opens help/resumes. The game also pauses when the window loses focus.

`npm run build` creates a portable `dist/` folder with relative assets. Serve it over HTTP (`npm run preview`); no CDN or runtime network service is needed. `npm test` runs simulation tests. `?dev=1` shows FPS/draw calls; `?qa=1` runs the browser integration harness and displays results.

## Play

| Input | Action |
|---|---|
| WASD | Move / accelerate, reverse, steer |
| Shift | Sprint / higher vehicle top speed |
| Space | Jump / vehicle brake |
| C | Hold to crouch |
| Mouse | Look; drag if pointer capture unavailable |
| E | Enter nearby vehicle / exit at low speed |
| Left / right mouse | Fire / focus aim |
| 1 / 2 / 3 | Pistol / automatic rifle / shotgun |
| R | Reload |
| Escape / H | Pause / help |

Red diamonds identify hostile crews. Takedowns grant score, reserve ammo, and health drops. Fast driving also earns score. Best score saves locally in this browser. Death gives immediate restart and restores the parked vehicles. There is no email collection or cross-device account service.

## Locked world contract and multiplayer foundation

`src/world.js` is the canonical **midtown-v1** world: meter units, Y-up, X east, Z south, forward -Z at yaw=0. West 42nd Street is Z=0. Avenues are X=-180,-90,0,90,180; cross streets are Z=-180,-120,-60,0,60,120,180. Roads are 20m wide and sidewalks 5m. Collision footprints, minimap and simulation all consume these coordinates. Seed 4202026 fixes generation. Visual changes must preserve these values, stable entity IDs and collision footprints; incompatible changes require a world-version bump.

Simulation runs at 60Hz with serializable player/vehicle/NPC state, independent visual objects, bounded collision substeps, and seeded generation. `src/network.js` provides the local command buffer, versioned snapshots and a WebSocket transport interface. The current game runs a **single local authority**. Online rooms, server authority, reconciliation, remote interpolation, ownership arbitration, reconnect and anti-cheat are future work; a transport class alone is not live multiplayer. Do not trust client snapshots for a future authoritative server. Scores are intentionally local and editable.

## Scope

24 city blocks, 16 vehicles including sport bikes and moving traffic, 36 NPCs, three weapons, health/combat/respawn, smooth third-person camera, minimap, speedometer, procedural WebAudio and original neon signage. Buildings have exterior collision only; no interiors, missions, real police simulation or mobile touch controls. Arcade traffic and collision use approximate circular vehicle bodies rather than rigid-body physics.

Performance varies by GPU. Low graphics reduces pixel density. The renderer uses instancing and merged vehicle geometry; the debug overlay reports the actual frame rate rather than assuming 60 FPS on every device.

## Project structure

- `src/world.js`: fixed map coordinates, deterministic random generation, and collisions.
- `src/city.js`, `src/vehicles.js`, `src/combat.js`: procedural scenery and gameplay systems.
- `src/main.js`, `src/style.css`, `index.html`: input, camera, game loop, audio, and interface.
- `src/network.js`: local session and future WebSocket transport boundary.
- `tests/`: world, vehicle, and combat simulation tests.
- `tools/browser-smoke.js`: optional browser integration checks.
- `design/assets.csv`: manifest of code-generated assets.

## License

Released under the [MIT License](LICENSE). You may use, modify, and redistribute this code, including commercially, while retaining its copyright and license notice. Dependencies retain their own licenses.
