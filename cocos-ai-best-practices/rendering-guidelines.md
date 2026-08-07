# Rendering Guidelines

## Sprite Visibility Checklist

For a Sprite to be visible in Preview, **all** of the following must be true:

| Requirement | How to Verify |
|-------------|--------------|
| SpriteFrame is assigned (not null/empty) | `component_query` → spriteFrame.uuid is not empty |
| Color alpha > 0 | `component_query` → color.a > 0 |
| UITransform contentSize > 0 | `component_query` → contentSize.width > 0 AND height > 0 |
| Node is active | `node_query` → active: true |
| Parent node is active | Check all ancestors are active |
| Camera can see the node's layer | Camera visibility bitmask includes node's layer |
| sizeMode is CUSTOM (0) when using contentSize | sizeMode must be 0 for contentSize to take effect |
| Camera is bound to Canvas | Canvas.cameraComponent is set |

If any one of these fails, the Sprite will not render.

## SpriteFrame Selection

### Built-in SpriteFrames

Cocos Creator provides several built-in sprite frames in `db://internal/default_ui/`:

| Asset | UUID (spriteFrame) | Description |
|-------|-------------------|-------------|
| default_btn_normal.png | `20835ba4-6145-4fbc-a58a-051ce700aa3e@f9941` | White/light rounded rectangle — good for colored blocks |
| default_sprite.png | `57520716-48c8-4a19-8acf-41c9f8777fb0@f9941` | Mountain/landscape placeholder icon — NOT a white block |
| default_sprite_splash.png | `7d8f9b89-4fd1-4c9f-a3ab-38ec7cded7ca@f9941` | Cocos splash image |
| default_panel.png | `b730527c-3233-41c2-aaf7-7cdab58f9749@f9941` | Panel background with border |

### Recommendation

For placeholder colored blocks, use `default_btn_normal.png` (`20835ba4-6145-4fbc-a58a-051ce700aa3e@f9941`). It renders as a simple white rectangle that responds correctly to color tinting.

**Do NOT use `default_sprite.png`** for placeholder blocks — it contains a mountain/landscape icon that looks like a "missing asset" indicator.

## Runtime Sprite Creation

When creating Sprites dynamically at runtime (via code):

```typescript
const sprite = node.addComponent(Sprite);
sprite.color = new Color(255, 255, 0, 255);
sprite.sizeMode = Sprite.SizeMode.CUSTOM;
// CRITICAL: must set spriteFrame, otherwise nothing renders
sprite.spriteFrame = someSpriteFrame;
```

### The SpriteFrame Problem

A `cc.Sprite` component with no `spriteFrame` will:
- Exist in the hierarchy ✔
- Have a color set ✔
- Have a size set ✔
- **Render nothing** ✘

This is the most common cause of "node exists but is invisible" in runtime-created objects.

### Solutions for Runtime Sprites

**Option A: Copy from existing sprite**

```typescript
const playerSprite = this.getComponent(Sprite);
if (playerSprite && playerSprite.spriteFrame) {
    newSprite.spriteFrame = playerSprite.spriteFrame;
}
```

**Option B: Expose as @property**

```typescript
@property({ type: SpriteFrame })
bulletSpriteFrame: SpriteFrame | null = null;
```

Then assign in Inspector or via MCP `set_component_property`.

**Option C: Load from resources**

```typescript
resources.load('path/to/sprite', SpriteFrame, (err, sf) => {
    sprite.spriteFrame = sf;
});
```

Option A is recommended for quick prototyping. Option B is recommended for production.

## Layer and Visibility

Nodes are assigned to layers. Camera only renders nodes whose layer matches its visibility bitmask.

| Layer | Value | Use Case |
|-------|-------|----------|
| DEFAULT | 1073741824 | General 3D objects |
| UI_2D | 33554432 | 2D UI elements under Canvas |

For a 2D scene, Camera visibility should include both `UI_2D` and `DEFAULT`:

```
UI_2D (33554432) + DEFAULT (1073741824) = 1107296256
```

Nodes created as `2DNode` type under Canvas default to layer `1073741824` (DEFAULT), so the Camera must see the DEFAULT layer.
