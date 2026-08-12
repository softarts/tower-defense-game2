# 3D Asset Integration Guidelines

## Overview

This document captures verified best practices for importing and using 3D game assets (FBX models, textures, materials) in Cocos Creator 3.8+. These guidelines are derived from actual issues encountered during the MachineGun Tower integration and apply to all future 3D asset work (towers, enemies, projectiles, etc.).

All Scene/Node/Component operations must use Cocos MCP. Do not hand-edit scene JSON.

---

## 1. FBX / Mesh Import

3D resources may contain multiple FBX files per game object:

```
Base_MachineGun_L01.fbx
Turret_MachineGun_L01.fbx
```

After import, verify:

- Mesh exists and is recognized by Cocos
- MeshRenderer component is present on the instantiated node
- Mesh has UV coordinates (`a_texCoord` attribute)
- Mesh Bounds are reasonable (check `minPosition` / `maxPosition` in library JSON)
- The coordinate origin is defined by the art asset, not by guesswork

### Mesh Bounds Rule

Do NOT assume Turret needs a Y offset. Check the actual mesh bounds first.

Example from this project:

| Model | Min Y | Max Y |
|-------|-------|-------|
| Base | 0 | 0.80 |
| Turret | 0.769 | 1.408 |

Both placed at `position = (0, 0, 0)` results in correct stacking because the geometry already encodes the height relationship.

**Always check mesh bounds before adding position offsets.**

---

## 2. FBX Embedded Texture Problem

Do NOT assume FBX embedded textures are valid.

### Known Issue

FBX files exported from Unity may contain broken embedded textures:
- Library image files are only ~70 bytes (empty/invalid)
- Material is generated but has no `albedoMap` reference
- Model renders as **pure white**

### Diagnosis

If a model appears white after import:

1. Check material `_props` — is `albedoMap` present?
2. Check material `_defines` — is `USE_ALBEDO_MAP: true`?
3. Check the embedded image file size in `library/` — is it > 1KB?
4. If embedded texture is broken (< 100 bytes), use standalone texture

Do NOT modify Mesh, UV, Lighting, or Camera to fix a white model. The issue is always texture/material binding.

---

## 3. Albedo Map / Texture Binding

The correct rendering chain:

```
Mesh + UV + Material(albedoMap=Texture2D) = Correctly colored model
```

### Material Requirements for Textured Rendering

```json
{
  "_defines": [{"USE_ALBEDO_MAP": true}],
  "_props": [{
    "albedoMap": {"__uuid__": "<texture2d-uuid>"},
    "mainColor": {"r": 255, "g": 255, "b": 255, "a": 255}
  }]
}
```

Key points:
- `USE_ALBEDO_MAP: true` is REQUIRED — without it the shader ignores the texture
- `mainColor` should be white (255,255,255) to preserve original texture colors
- Do NOT add color tints to simulate the texture appearance
- The blue/grey colors come from the TEXTURE, not from code parameters

---

## 4. Standalone Material Strategy

For FBX assets with broken embedded textures, create a standalone material:

```
assets/resources/tower/machinegun/MachineGun_L01.mtl
```

Material configuration:
- Effect: `builtin-standard`
- Define: `USE_ALBEDO_MAP: true`
- albedoMap: Reference to the standalone Texture2D
- mainColor: White

Then assign this material to both Base and Turret MeshRenderers.

### Why Not Library Modification Only

Directly modifying `library/*.json` works for immediate testing but:
- Library files are regenerated on FBX reimport
- Changes are not version-controlled
- Cannot be shared across team members

Use library modification for diagnosis only. The permanent fix is a standalone material.

---

## 5. Texture Management

### Do Not Duplicate

If a texture already exists in the project, reference it. Do not copy the same TIF/PNG multiple times.

### TIF Support

Cocos Creator 3.8 imports TIF files and converts them to PNG internally. The converted PNG is stored in `library/`. TIF files generate:
- `cc.ImageAsset` (the raw image)
- `cc.Texture2D` (the GPU-ready texture — use THIS UUID for material binding)
- `cc.SpriteFrame` (for 2D use — do NOT use for 3D material binding)

### Important: Texture2D vs SpriteFrame

For 3D materials, always use the Texture2D sub-asset, NOT the SpriteFrame:
- Texture2D UUID format: `<image-uuid>@6c48a`
- SpriteFrame UUID format: `<image-uuid>@f9941`

---

## 6. Color Debugging Order

When a 3D model has incorrect colors, check in this order:

1. Mesh exists and renders (shape visible)
2. UV coordinates exist on mesh
3. Material is assigned to MeshRenderer
4. Material has `albedoMap` property
5. `USE_ALBEDO_MAP` define is true
6. Texture2D asset is valid (file size > 1KB)
7. Texture2D is correctly referenced in material
8. `mainColor` is white (not overriding texture)
9. Shader/Effect is `builtin-standard`
10. Lighting exists and is reasonable

Do NOT jump to lighting adjustments if albedoMap is missing. Fix texture binding first.

---

## 7. Camera for Tower Defense (Top-Down)

### Rotation

Tower Defense games use a steep top-down viewing angle:

```
Recommended: rotation.x = -65 degrees
```

| Angle | View Type |
|-------|-----------|
| -35° | Too shallow — sees mostly front/side |
| -45° | Isometric — moderate |
| -65° | Top-down TD — sees mostly top |
| -90° | Pure overhead — no 3D depth |

### Position (Framing)

Camera position controls distance/framing, NOT angle:

- Closer = tower fills more screen
- Farther = tower appears smaller with more margin

Target: Tower occupies 60-75% of viewport with no clipping.

### Do NOT use these to fix framing:

- Tower Scale — this is for world-unit adaptation, not camera framing
- Camera Far plane — only affects maximum render distance
- FOV — only change if perspective distortion is problematic

### Adjustment Order

1. Set rotation first (determines viewing angle)
2. Then adjust position for correct framing
3. Verify with Preview

---

## 8. Base + Turret Node Structure

Recommended hierarchy:

```
TowerTest (scale for world adaptation)
├── Base (position 0,0,0)
│   └── MGun_L01_Base [MeshRenderer]
└── Turret (position based on mesh bounds)
    └── MGun_L01_Turret [MeshRenderer]
```

### Position Rules

- Check mesh bounds BEFORE setting positions
- If mesh geometry already includes height offset: use (0,0,0)
- If meshes share the same coordinate origin: use (0,0,0) for both
- Only add position offset when mesh bounds confirm it's needed

---

## 9. Tower Scale

3D assets may use different unit scales than the game world. A uniform scale on the parent node adapts them:

```
TowerTest.scale = (5, 5, 5)  // adapts ~1.4m model to game world
```

Scale is for **resource-to-world adaptation**, NOT for camera framing.

Do NOT change Tower Scale to fix:
- Camera too close → move camera instead
- Tower appears small → adjust camera position or FOV
- Clipping → move camera farther

---

## 10. Preview Verification Rules

### Never claim visual PASS without actual Preview

- "Scene saved successfully" ≠ "Rendering is correct"
- "Build panel opened" ≠ "Preview verified"
- Camera position/rotation values ≠ visual confirmation

### If Preview cannot be auto-launched:

Report: "Camera/Scene has been modified. Visual Preview requires manual verification."

### Preview checklist:

- [ ] Model shape is correct
- [ ] Texture colors are correct (not white/grey)
- [ ] Base and Turret both visible
- [ ] No clipping at screen edges
- [ ] Top-down angle is appropriate
- [ ] Reasonable margin around tower

---

## 11. New 3D Asset Verification Flow

When adding ANY new 3D resource (tower, enemy, projectile):

```
Step 1:  Confirm FBX imports successfully
Step 2:  Confirm MeshRenderer exists
Step 3:  Confirm Mesh is valid (check bounds)
Step 4:  Confirm UV exists (a_texCoord attribute)
Step 5:  Confirm Material exists
Step 6:  Confirm Albedo Texture is valid (not broken embedded)
Step 7:  If embedded texture broken → standalone Texture + Material
Step 8:  Confirm mainColor = white (no unwanted tint)
Step 9:  Check Mesh Bounds for node positioning
Step 10: Combine nodes with correct positions
Step 11: Set Top-Down Camera angle
Step 12: Adjust Camera distance for framing
Step 13: Preview verification
```

Only after ALL steps pass should game logic development begin.

---

## 12. Separation Principle

**Do not mix resource problems with game logic.**

If a 3D model doesn't render correctly:
- Fix Mesh/Texture/Material/UV/Transform/Camera FIRST
- Do NOT simultaneously implement Enemy AI, Attack Range, Bullet spawning, etc.

3D Resource Integration is an independent verification phase.

---

## 13. Verified MachineGun L01 Resources

| Asset | Path | Status |
|-------|------|--------|
| Base FBX | `assets/resources/tower/machinegun/Base_MachineGun_L01.fbx` | PASS |
| Turret FBX | `assets/resources/tower/machinegun/Turret_MachineGun_L01.fbx` | PASS |
| Texture | `assets/resources/tower/machinegun/MachineGun_Level1_tex_v001.tif` | PASS |
| Material | `assets/resources/tower/machinegun/MachineGun_L01.mtl` | PASS |

| Verification | Result |
|-------------|--------|
| Mesh | PASS |
| UV | PASS |
| Texture Import | PASS |
| Albedo Map Binding | PASS |
| Material | PASS |
| Base Rendering | PASS |
| Turret Rendering | PASS |
| Base/Turret Alignment | PASS |
| Top-Down Camera | PASS |
| Camera Framing | PASS |
