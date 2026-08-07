# Common Pitfalls

## Sprite Invisible

**Symptom**: Node exists in hierarchy, but nothing renders in Preview.

**Possible causes** (check in order):

1. `spriteFrame` is null/empty — most common cause
2. `UITransform.contentSize` is (0, 0)
3. `color.a` (alpha) is 0
4. `sizeMode` is TRIMMED (1) or RAW (2) with no spriteFrame texture
5. Camera visibility doesn't include the node's layer
6. Camera not bound to Canvas (`cameraComponent` is empty)
7. Node or parent is inactive (`active: false`)
8. Node is positioned far off-screen

**Fix approach**: Query the Sprite component properties first. In most cases, assigning a valid spriteFrame resolves the issue.

## Placeholder Sprite Confusion

**Symptom**: Node renders as a "mountain/landscape" icon instead of a colored block.

**Root cause**: Using `default_sprite.png` (UUID: `57520716-...@f9941`) which is a demonstration image, not a white placeholder.

**Fix**: Use `default_btn_normal.png` (UUID: `20835ba4-6145-4fbc-a58a-051ce700aa3e@f9941`) for colored placeholder blocks.

## Runtime Node Invisible

**Symptom**: Code creates a node (visible in hierarchy during Play), but it doesn't render.

**Root cause**: Runtime-created `Sprite` component has no `spriteFrame` assigned.

**Fix**: Always assign a spriteFrame when creating Sprites in code. Copy from an existing sprite or expose via `@property`.

**Diagnostic rule**: If hierarchy shows the node but Preview doesn't render it, the problem is always a rendering property — not the node's existence.

## Black Screen on Preview

**Symptom**: Preview shows entirely black or dark gray screen.

**Possible causes**:

1. Canvas has no `cameraComponent` bound
2. Camera `clearFlags` is `DEPTH_ONLY` (6) — change to `SOLID_COLOR` (7)
3. Camera `visibility` doesn't include `UI_2D` or `DEFAULT` layers
4. Camera `orthoHeight` is extremely small (e.g., 10)
5. No Sprites have valid spriteFrame assignments

**Fix approach**:
1. Check Canvas → cameraComponent binding first
2. Then check Camera clearFlags and visibility
3. Then check individual Sprite spriteFrame values

## Script Exists but Not Attached

**Symptom**: Script file exists in assets, but node doesn't have the component.

**Possible causes**:

1. Script wasn't attached via `node_script_management`
2. Script has compilation error (check with `check_script`)
3. Script `@ccclass` name doesn't match filename
4. Script was attached to wrong node

**Fix**: Verify with `check_script`, then attach with correct node UUID and script path.

## Canvas Not Rendering

**Symptom**: Canvas exists with children, Camera exists, but nothing renders.

**Root cause**: `cc.Canvas.cameraComponent` property is empty.

**Fix**: Set `Canvas._cameraComponent` to the Camera node UUID using `set_component_property` with type `component`.

## Physics Objects Fall Through

**Symptom**: Dynamic body falls infinitely, doesn't collide with ground.

**Possible causes**:

1. Ground RigidBody2D type is not Static (0)
2. BoxCollider2D size is (0, 0) or doesn't match visual
3. Collider groups don't overlap in collision matrix
4. Physics system is disabled in project settings

## Root Cause First

**Principle**: Any bug should be diagnosed before it is fixed.

The debugging approach:

1. **Observe** — What exactly is the symptom?
2. **Query** — What is the actual state of the scene/node/component?
3. **Compare** — What should the state be vs. what it is?
4. **Identify** — What single property or configuration is wrong?
5. **Fix** — Make the minimal change to correct that specific issue.
6. **Verify** — Preview again to confirm.

**Anti-pattern**: Seeing "sprite invisible" → rewriting the entire script. This wastes time and may introduce new bugs.

**Correct approach**: Seeing "sprite invisible" → query spriteFrame → discover it's null → assign valid spriteFrame → verify.
