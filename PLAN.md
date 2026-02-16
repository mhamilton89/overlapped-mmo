# 3D MMO Prototype - Implementation Plan

## Overview

Build a WoW-style 3D MMO client using **Three.js**, reusing the existing Node.js/Express/WebSocket/PostgreSQL backend from the 2D MMO at `game_dev/`. Start with 1 zone featuring the low-poly tree pack, interactive gathering, and player movement.

## What We're Working With

### 3D Assets (this project)
- 21 low-poly FBX tree models (`Tree_temp_climate_001-021.FBX`)
- 1 shared texture atlas (`T_Trees_temp_climate.png`)

### Reusable Backend (from game_dev/)
- **100% reusable as-is:** Auth, character classes, XP/leveling, equipment/inventory, loot, WebSocket protocol
- **95% reusable:** Combat (builder/spender), enemy AI, resource gathering
- **Needs extension:** Movement handler (add rotation), coordinates (add Z for terrain height)

---

## Project Structure

```
overlapped/
├── client/                          # Three.js 3D client
│   ├── index.html                   # Entry HTML
│   ├── css/
│   │   └── styles.css               # HUD/UI styles
│   ├── src/
│   │   ├── main.js                  # Entry point, init scene
│   │   ├── Game.js                  # Main game loop class
│   │   ├── networking/
│   │   │   └── WebSocketClient.js   # WS connection to existing server
│   │   ├── world/
│   │   │   ├── Terrain.js           # Ground plane with grass texture
│   │   │   ├── TreeManager.js       # FBX tree loading & placement
│   │   │   └── Skybox.js            # Sky/fog/atmosphere
│   │   ├── entities/
│   │   │   ├── Player.js            # Local player (capsule placeholder)
│   │   │   └── OtherPlayer.js       # Remote player rendering
│   │   ├── controls/
│   │   │   ├── InputManager.js      # WASD + keybinds
│   │   │   └── CameraController.js  # Third-person orbit camera
│   │   ├── systems/
│   │   │   ├── GatheringManager.js  # Tree interaction + gather protocol
│   │   │   └── InteractionManager.js # Raycasting, selection, targeting
│   │   └── ui/
│   │       ├── HUD.js               # Health/mana bars, minimap
│   │       └── GatherProgressBar.js # Gathering progress overlay
│   └── assets/
│       ├── models/trees/            # Copy FBX trees here
│       └── textures/                # Tree texture + generated grass
├── server/                          # Symlink or copy of game_dev/server
├── PLAN.md
└── package.json                     # Three.js + Vite
```

---

## Phase 1: Scene & Movement (START HERE)

### Step 1: Project scaffolding
- Initialize npm project with `three` and `vite` dependencies
- Create directory structure above
- Copy FBX tree assets into `client/assets/models/trees/`
- Copy texture into `client/assets/textures/`
- Create `index.html` with a canvas container and basic HUD elements

### Step 2: Three.js scene setup (`Game.js`, `main.js`)
- WebGL renderer with antialiasing and shadows
- Perspective camera (FOV 60)
- Lighting: ambient + directional sun + hemisphere for natural look
- Fog for draw distance fade (WoW-style)
- Render loop with `requestAnimationFrame` and delta time

### Step 3: Terrain (`Terrain.js`)
- Start with a large `PlaneGeometry` (512x512 units)
- Procedural grass texture (repeating green with noise variation)
- Receive shadows from trees
- Future: heightmap displacement for hills

### Step 4: Tree loading (`TreeManager.js`)
- Use Three.js `FBXLoader` to load all 21 tree variations
- Cache templates, clone for placement (performance)
- Apply shared texture atlas to all meshes
- Place trees across terrain (random scatter for Phase 1, server-driven positions for Phase 2)
- Random rotation per tree for variety
- Trees cast shadows

### Step 5: Player character (`Player.js`)
- Capsule geometry placeholder (color-coded by class)
- WASD movement relative to camera facing direction
- Move speed: ~5 units/sec
- Face movement direction
- Constrained to terrain bounds

### Step 6: Camera controller (`CameraController.js`)
- WoW-style third-person orbit camera
- Right-click drag to rotate camera
- Scroll wheel to zoom in/out (3-30 unit range)
- Smooth follow with lerp
- Pitch limits to prevent flipping
- Camera targets above player's feet (head height)

### Step 7: Input manager (`InputManager.js`)
- WASD for movement
- E/F for interact
- Mouse for camera control
- Prevent input when typing in chat (future)

---

## Phase 2: Backend Integration

### Step 8: Server setup
- Symlink or reference the existing `game_dev/server/` code
- Add a route to serve the 3D client alongside the existing 2D one
- Minor server modification: include `rotation` field in `playerMoved` broadcasts

### Step 9: WebSocket client (`WebSocketClient.js`)
- Connect to existing WS server using same protocol
- Reuse all existing message types: `join`, `move`, `playerJoined`, `playerMoved`, `playerLeft`
- Map 2D coords: `x` stays `x`, 2D `y` becomes 3D `z`
- Send position updates at ~100ms throttle to match server tick rate

### Step 10: Multiplayer sync
- Render other players as colored capsules
- Interpolate remote player positions (lerp toward target)
- Show nameplates above other players (HTML overlay or sprite)
- Handle join/leave events

---

## Phase 3: Interactive Trees (Gathering)

### Step 11: Interaction system (`InteractionManager.js`)
- Raycasting from mouse to detect tree meshes
- Highlight hovered tree (emissive glow or outline)
- Show "Gather" tooltip on hover
- Store `userData` on each tree mesh: `{ resourceId, resourceType, available }`

### Step 12: Gathering integration (`GatheringManager.js`)
- Press & hold E near a tree to start gathering
- Send `gatherStart` → server validates distance & availability (reuses `resourceGathering.js` as-is)
- Show progress bar during `gatherTime` (3s for oak trees)
- On complete: server sends `gatherCompleteResult` with yields
- Handle `resourceDepleted` / `resourceRespawned` broadcasts (fade tree in/out)
- Coordinate mapping: server uses 2D (x,y), client maps to 3D (x,z)

### Step 13: Gather UI (`GatherProgressBar.js`)
- Centered bottom-of-screen progress bar (WoW style)
- Resource name label
- Smooth fill animation
- Flash green on success

---

## Phase 4: Combat & Enemies (Future)

- Port enemy AI rendering (placeholder capsules, red-colored)
- Implement click-to-target on enemies
- Port builder/spender combat system
- Health bars above entities
- Death/respawn animations
- Ability bar UI

## Phase 5: Full UI (Future)

- Character stats panel
- Inventory window
- Equipment slots
- Chat system
- Minimap

## Phase 6: Polish (Future)

- Replace capsule placeholders with actual character models
- Animation system (idle, walk, attack, gather)
- Particle effects
- Audio (ambient, combat, gathering sounds)
- Heightmap terrain with hills
- Water features

---

## Coordinate System

| 2D (existing) | 3D (Three.js)    | Notes              |
|----------------|-------------------|--------------------|
| `x`            | `x`               | Horizontal         |
| `y`            | `z`               | Depth/forward      |
| N/A            | `y`               | Height (vertical)  |

Conversion helpers:
- `to3D(x2d, y2d) → { x: x2d, y: 0, z: y2d }`
- `to2D(x3d, z3d) → { x: x3d, y: z3d }`

---

## Key Technical Decisions

1. **Three.js** over Babylon.js - lighter weight, integrates naturally with the existing Node.js stack, huge community
2. **Vite** for dev server - fast HMR, native ES module support, handles FBX loading
3. **Reuse existing server** - no new backend needed, just extend message payloads slightly
4. **Placeholder geometry** for characters first - get gameplay working before worrying about models
5. **FBX tree pack** as first interactive world objects - trees serve dual purpose as scenery and gathering nodes
