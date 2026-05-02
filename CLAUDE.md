# CLAUDE.md — Overlapped MMO

Project-specific guidance for Claude Code. Auto-loaded every session.
See `PLAN.md` for the original implementation blueprint.

---

## Stack

- **Client**: Three.js v0.182.0, Vite v4.5, vanilla ES modules (no bundler config beyond Vite)
- **Server**: Node.js, Express 5, `ws` WebSocket, PostgreSQL
- **Platform**: Windows (bash/Git-Bash shell). Use forward slashes in paths, `/dev/null` not `NUL`.

---

## Run / Stop

From project root (`overlapped-mmo/`):

```bash
# Client (Vite dev server on :5173)
npx vite client

# Server (WS :3001, REST :3002)
cd server && node index.js
```

Both are started with `run_in_background`. Before starting, check if ports are already in use:

```bash
netstat -ano | grep LISTENING | grep -E ":(5173|3001|3002)"
```

There is no test suite. There is no lint step. Syntax check an ESM file with:

```bash
node --input-type=module --check < path/to/file.js
```

---

## Architecture Boundaries

### Two editors — don't conflate them

1. **`VoxelDesigner`** (`client/src/designer/`) — full-screen overlay for **authoring** equipment/assets. Opens from the game with a hotkey. Has its own renderer, scene, camera.
2. **`EditorSystem`** (`client/src/editor/`) — in-world build tools (admin-only). Place blocks, paint, stamp saved assets into the live world. Shares the game's main scene/camera.

They are separate systems. A change to one rarely affects the other.

### VoxelDesigner is dual-mode

- **Voxel Mode** — paint cubes in a sparse voxel grid. Stamps (sphere/cone/etc.) are **voxelized approximations**, by design.
- **Object Mode** — place real Three.js primitives (box/sphere/cylinder/cone/torus/wedge), select with click, manipulate with `TransformControls` gizmo.
- You can't mix modes in one asset. Mode toggle is the tab bar at the top of the right panel.
- Mannequin and grid auto-rescale per mode: Voxel uses `voxelScale=0.04` with 25× mannequin; Object uses real world units with 1:1 mannequin.

---

## Equipment Piece Format

Equipment composes from pieces attached to body parts. Object Mode exports must match this shape — `CharacterModel.equipArmor()` + `armorVisuals.js` already consume it, no adapter layer.

```js
{
    target: 'torso',           // body-part name (see CharacterModel bone map)
    geo: { type: 'sphere', radius: 0.36, ... },  // Three.js geometry + params
    offset: [x, y, z],
    rotation: [x, y, z],
    color: 0xhexcolor,
    metalness: 0..1,
    roughness: 0..1,
}
```

Full armor definition: `{ slot, pieces: [...] }`.

---

## LocalStorage Keys

- `voxel_designs` — saved designs (editable snapshots from the designer)
- `custom_equipment` — exported equip-ready definitions
- Nothing in the game currently *reads* `custom_equipment` to equip onto a character — that's a known gap.

---

## Rendering Pipeline

Both the game and the designer render through an **EffectComposer**, not `renderer.render()` directly. The shared composer factory is in `client/src/rendering/PostFX.js`:

`RenderPass → OutlinePass → UnrealBloomPass → FXAA ShaderPass → OutputPass`

- Game: `this.postfx.composer.render()` — see `Game.js` animate loop.
- Designer: same module, tuned subtler (lower bloom, outline for selection only). Designer and game share the same PostFX helper so **what you design = what you see in-world**.
- If you add a new scene/camera that renders to screen, route it through `createPostFX(renderer, scene, camera, opts)` instead of `renderer.render()`. Otherwise post-processing and outlines will be missing and it won't match the rest of the game.
- Resize: `postfx.setSize(w, h)` alongside `renderer.setSize(w, h)`.
- `OutlinePass.selectedObjects` is refreshed each frame in `Game.js` with player + otherPlayers + enemy meshes. Trees and terrain are intentionally not outlined (too noisy).

### Look conventions
- **Tone mapping**: `NoToneMapping` + `SRGBColorSpace`. ACES was tested and crushed midtones — don't re-enable without checking vertex-color brightness.
- **Fog**: `FogExp2(0xbfdeff, 0.008)`. Color matches Skybox horizon so terrain fades into sky.
- **flatShading**: `true` on all `MeshStandardMaterial` / `MeshLambertMaterial` used for terrain, trees, characters, enemies, armor. Keeps the low-poly facets crisp.
- **Character segment counts**: primitives use `widthSegments: 6–8`, `heightSegments: 4–6` — low-poly silhouettes that read with the outline pass.
- **Grass tufts**: `GrassBillboards` — 2000-instance shader-swayed alpha quads. Persistent pool: each slot keeps its world-space position and only gets re-randomized when the player drifts farther than `SCATTER_RADIUS` from it (amortized `RESPAWNS_PER_FRAME` via a sweep cursor). No wholesale re-shuffle — grass doesn't pop in as you walk. Fade range (`FADE_START`/`FADE_END`) is camera-relative; size it generously since it's camera-distance, not player-distance.
- **Block palette** in `BlockRegistry.js` is saturation-bumped ×1.18 at module load. If you add a new block, author its raw color and let the load-time pass saturate it — don't hand-saturate the literal.

---

## Camera / Input Conventions

- **Never use pointer lock.** Cursor is always visible. Both the player's `CameraController` and the editor's `FreeFlyCamera` use **right-drag** to rotate.
- Aim raycasts from the **cursor position**, not screen center. The editor's center `#crosshair` is purely decorative.
- `#aim-reticle` is the combat-mode cursor reticle (white ring → red-grown ring over enemies → yellow over loot). It tracks `mousemove` in `Game.js` and its state is updated each frame by `_updateAimReticle()`. Hidden while `editorSystem.enabled`.
- Hover highlight is painted by `postfx.hoverOutlinePass` (brighter red outline) — a second OutlinePass that's independent of the world silhouette pass. `selectedObjects` is set to `[hoveredEnemyMesh]` each frame.
- Free-fly keybinds: WASD move, **Space = up**, **Z = down**, Shift = fast, right-drag = rotate. Q/E are legacy aliases.

---

## Starter Town

Spawn point is `(0, 21, 0)` — the top air block of the grass plaza. The town is seeded into the `world_blocks` delta table on server boot by `seedStarterTown()` (`server/game/starterTown.js`), which checks for a torch at `(0, 21, 3)` as an idempotency marker and skips if already present.

Online clients receive the town through the normal chunk-delta flow. In offline mode, `Game._startOfflineMode()` calls `stampStarterTown(chunkManager)` from `client/src/world/StarterTown.js`, which mirrors the server module block-for-block.

**Duplication, not shared module.** Server is CJS, client is ESM — the two `StarterTown` files are kept in sync manually. If you edit one, update the other in the same change. Both expose `buildStarterTown()` returning `[{x, y, z, blockId}, ...]`. Layout blocks: 11×11 cobble plaza, campfire 3N of spawn, 4 lamp posts, 4 small houses (rotations 0/1/2/3 around the plaza), market stall, watch tower, cardinal dirt paths, trees/bushes/flowers in the outer ring.

---

## Admin Gating

`EditorSystem` is admin-only. Check for the admin flag on the player before exposing in-world build tools. Don't bypass this check.

---

## Code Style

- Keep changes minimal and surgical. No unrequested refactors, no "while we're here" cleanup.
- Default to no comments. Only add comments for non-obvious *why* (constraints, invariants, workarounds). Identifier names carry the *what*.
- No backwards-compat shims, no feature flags, no dead-code placeholders. Delete cleanly.
- Prefer editing existing files over creating new ones.

---

## Self-Verify

When I make a change, verify it myself (syntax check, grep for residue, read the edited block back if needed) rather than asking the user to reload and describe what they see. If I truly can't verify (UI-only behavior), say so explicitly.
