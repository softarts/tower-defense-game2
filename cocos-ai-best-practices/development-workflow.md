# Development Workflow

## AI Development Lifecycle

The recommended lifecycle for AI-assisted Cocos Creator development:

```
Read Skill
    ↓
Open Scene
    ↓
Query Scene (understand current state)
    ↓
Modify Scene via MCP
    ↓
Generate / Update TypeScript
    ↓
Attach Script to Node
    ↓
Save Scene
    ↓
Validation (0 errors, no missing scripts)
    ↓
Preview
    ↓
Visual Verification (does it look correct?)
    ↓
Debug if needed
    ↓
Repeat
```

## Core Principles

### Scene Modifications via MCP Only

All scene changes must go through MCP tools:

- `node_lifecycle` for creating/deleting nodes
- `node_transform` for position/rotation/scale
- `component_manage` for adding/removing built-in components
- `node_script_management` for attaching custom scripts
- `set_component_property` for configuring component values
- `scene_management` for save/open/close

### Forbidden Operations

- Never edit `.scene` JSON files directly
- Never modify `__id__` references
- Never modify `*.meta` files
- Never modify UUIDs

### Script Management

- Create scripts via `asset_operations` (create action)
- Update scripts via `asset_operations` (save action)
- Always verify compilation with `check_script` before attaching
- Attach via `node_script_management`

## Incremental Development

Do not attempt to build a complete game in a single pass. Instead, develop and verify one feature at a time:

```
Feature 1: Player visible on screen
    → Preview ✔

Feature 2: Player movement works
    → Preview ✔

Feature 3: Bullet spawns and flies
    → Preview ✔

Feature 4: Enemy appears
    → Preview ✔

Feature 5: Collision detection
    → Preview ✔
```

### Why Incremental?

- Easier to isolate which change introduced a problem
- Each Preview confirms a working baseline
- Avoids compounding errors that become hard to debug
- Provides clear rollback points

### Checkpoint Rule

After completing each feature:

1. Save the scene
2. Run validation (check for errors)
3. Preview and visually verify
4. Only then proceed to the next feature

If Preview fails at any checkpoint, fix the issue before moving forward. Never stack features on top of a broken baseline.

## Script Development Pattern

When creating TypeScript components:

1. Write the script file via `asset_operations`
2. Wait for Cocos to compile (verify with `check_script`)
3. Attach to node via `node_script_management`
4. Configure `@property` values via `set_component_property` if needed
5. Save scene
6. Preview to verify behavior

### Import Pattern

Always use ESM imports from `'cc'`:

```typescript
import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
```

### Property Exposure

Expose configurable values via `@property` so they appear in Inspector:

```typescript
@property({ tooltip: 'Movement speed in pixels per second' })
moveSpeed: number = 300;
```
