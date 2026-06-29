# Backroom Generator

A pure frontend Backrooms generator built with Vite, TypeScript, and Three.js.

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL. The current seed and size are stored in the URL as query
parameters, so generated maps can be shared by copying the browser address.

## Controls

- `WASD` / arrow keys: move
- Mouse: look around after pointer lock
- `Shift`: run
- `N`: generate a new seed
- `R`: rebuild the current seed
- `Esc`: release pointer lock

## Implementation Notes

- Map generation is deterministic from `seed` and `size`.
- Simulation data is separate from Three.js scene objects.
- Walls, floors, ceilings, lights, and pillars use instanced meshes.
- Textures are generated at runtime with canvas, so the app has no external
  art or backend dependency.
