# Scene Guidelines

## Scene Modification Rules

### Query Before Create

Always query the scene before creating nodes:

```
node_query → find (check if node exists)
    ↓
If exists: skip creation or delete first
    ↓
If not: create new node
```

This prevents duplicate nodes and ensures idempotent operations.

### No Direct JSON Editing

Scene files (`.scene`) are serialized Cocos assets with internal `__id__` references. Direct editing will corrupt these references. All modifications must go through MCP tools.

### Node Lifecycle

- **Create**: `node_lifecycle` with action `create`
- **Delete**: `node_lifecycle` with action `delete`
- **Move**: `node_hierarchy` with action `move`
- **Duplicate**: `node_hierarchy` with action `duplicate`

### Component Lifecycle

- **Add built-in**: `component_manage` with action `add`
- **Remove**: `component_manage` with action `remove` (requires CID from `component_query`)
- **Add script**: `node_script_management` with action `attach`
- **Remove script**: `node_script_management` with action `remove` (requires scriptCid)

### Property Configuration

- Use `set_component_property` with correct `propertyType`
- Always verify with `component_query` after setting
- For asset references (spriteFrame, prefab), use the asset UUID

## Standard Scene Structure (2D)

A typical Cocos 3.8 2D scene:

```
Scene (cc.Scene)
├── Canvas (cc.UITransform + cc.Canvas + cc.Widget)
│   ├── Camera (cc.Camera) ← bound to Canvas.cameraComponent
│   ├── Background
│   ├── Game Objects...
│   └── UI Layer
└── (no other top-level nodes needed for pure 2D)
```

### Critical Binding: Canvas ↔ Camera

The `cc.Canvas` component has a `cameraComponent` property. If this is not bound to a Camera, **nothing under Canvas will render**.

When creating a scene from scratch:

1. Create Canvas node with `cc.Canvas` + `cc.Widget`
2. Create Camera node as child of Canvas with `cc.Camera`
3. Bind Camera to Canvas: set `Canvas._cameraComponent` to the Camera node UUID

### Camera Configuration for 2D UI

| Property | Recommended Value |
|----------|------------------|
| projection | ORTHO (0) |
| clearFlags | SOLID_COLOR (7) |
| visibility | UI_2D + DEFAULT (1107296256) |
| orthoHeight | 360 (half of design height) |
| near | 0 |
| far | 1000 |

## Scene Checklist

Before considering a scene complete, verify:

- [ ] **Hierarchy correct** — all required nodes exist in proper parent-child relationships
- [ ] **Components correct** — each node has all required components
- [ ] **Scripts attached** — custom scripts are bound to correct nodes
- [ ] **Properties configured** — component values match specification
- [ ] **Validation passed** — `check_ready` returns true, 0 console errors
- [ ] **Scene saved** — `isDirty` is false
- [ ] **Reload persistence** — close and reopen scene, verify hierarchy unchanged
- [ ] **Preview verified** — visual output matches expectation

## Save Discipline

- Save after every significant change (node creation, component addition, property modification)
- Verify `isDirty` is false after save
- Before closing scene, always save first
- After reopen, always re-verify hierarchy
