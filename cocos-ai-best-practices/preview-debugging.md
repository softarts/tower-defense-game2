# Preview Debugging

## Preview First Development

Preview success means more than zero console errors. It means the visual output matches expectations.

**Hierarchy correct ≠ Feature complete.**

A node existing in the hierarchy panel does not guarantee it is visible, interactive, or functional. Only a successful Preview with correct visual output confirms the task is done.

## Standard Debug Loop

When Preview shows unexpected results:

```
Preview (observe the problem)
    ↓
Observe (what exactly is wrong?)
    ↓
Query Node (does it exist? is it active?)
    ↓
Query Component (are all components present?)
    ↓
Query Property (are values correct?)
    ↓
Root Cause Analysis (why is it broken?)
    ↓
Fix (minimal targeted change)
    ↓
Save Scene
    ↓
Preview Again (verify fix)
```

### Key Rule

**Do not rewrite scripts on first failure.** Always query the scene state first:

1. Is the node active?
2. Does it have the expected components?
3. Are component properties set correctly?
4. Is the Camera configured to see the node?
5. Is there a spriteFrame assigned?

Most "invisible node" problems are property configuration issues, not script logic errors.

## Visual Acceptance

A task is complete only when:

1. **Structural**: Hierarchy matches specification
2. **Functional**: Scripts compile without errors
3. **Visual**: Preview renders the expected output
4. **Interactive**: User input produces expected behavior

### Visual Verification Checklist

- [ ] Background visible (if expected)
- [ ] Main game objects visible
- [ ] Colors match specification
- [ ] Positions are reasonable
- [ ] Sizes are appropriate
- [ ] No "missing asset" icons
- [ ] No black/blank screen

## Common Debug Scenarios

### Black Screen

Root causes (check in order):

1. Camera `clearFlags` set to `DEPTH_ONLY` instead of `SOLID_COLOR`
2. Camera `visibility` bitmask doesn't include `UI_2D` (33554432)
3. Canvas `cameraComponent` not bound to any Camera
4. Camera `orthoHeight` too small (nodes outside view frustum)
5. All nodes have empty spriteFrame (nothing to render)

### Node in Hierarchy but Invisible

Root causes:

1. Sprite has no `spriteFrame` assigned
2. `sizeMode` is `TRIMMED` or `RAW` but spriteFrame has no texture
3. UITransform `contentSize` is zero
4. Node or parent `active` is false
5. Node `layer` doesn't match Camera `visibility`
6. Color alpha is 0

### Script Attached but No Behavior

Root causes:

1. Script failed compilation (check with `check_script`)
2. `onLoad`/`start` has runtime error (check console logs)
3. Component `enabled` is false
4. Wrong node — script attached to different node than expected

## Console Monitoring

Always check console after Preview:

```
debug_console → get_logs → filter: error
```

Zero errors does not mean everything works (it might just mean nothing executes). But errors always indicate a problem that must be fixed.

## Preview Cannot Be Automated

MCP's `project_manage → run` opens the build panel but actual Preview requires manual interaction in the editor. The AI should:

1. Complete all scene setup
2. Save the scene
3. Instruct the user to Preview
4. Wait for user feedback
5. Debug based on reported observations
