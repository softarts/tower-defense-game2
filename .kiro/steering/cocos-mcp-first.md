---
inclusion: always
---
# Cocos MCP First Development Rules

This project uses Cocos Creator 3.8.8. The following rules are mandatory for all AI-assisted Cocos development in this workspace.

## BEFORE ANY COCOS WORK

Before starting any task that involves Cocos Creator scenes, nodes, components, or assets:
1. Read `cocos-ai-best-practices/mcp-first-uuid-integrity.md`
2. Read `cocos-ai-best-practices/development-workflow.md`
3. Follow the rules below strictly

## Rule 1: MCP First

All Scene structural operations MUST use Cocos MCP tools when available. AI must operate the Cocos Editor through MCP, not treat `.scene`/`.prefab` files as editable JSON.

MCP-required operations: Open/Close/Save Scene, Create/Delete/Rename Node, Add/Remove Component, Attach/Detach Script, Set Component Property, Set Transform, Set Asset Reference, Query Scene/Node/Component.

## Rule 2: Never Generate Cocos UUIDs

AI must NEVER create, guess, compute, or hardcode:
- Node UUIDs
- Component UUIDs (CID)
- Script Asset UUIDs
- Asset UUIDs
- SpriteFrame UUIDs
- Compressed `__type__` values
- `.meta` file UUIDs

UUIDs must always come from Cocos Editor or MCP query results.

## Rule 3: Never Directly Edit .scene or .prefab

These are Cocos serialized assets with internal `__id__` and UUID cross-references. Direct editing WILL corrupt references. This includes:
- Creating nodes by writing JSON
- Attaching scripts by writing `__type__` values
- Setting asset references by writing `__uuid__` values
- Modifying `__id__` reference arrays

## Rule 4: Never Generate .meta Files

Let Cocos Editor create `.meta` files on first import. AI-generated `.meta` files risk:
- UUID format issues (variant bits)
- Database inconsistencies
- Asset import failures

## Rule 5: Script Attachment via MCP Only

The `__type__` field uses UUID compression with standard base64 (NOT base64url). The `+` vs `-` difference causes "Missing class" errors that are extremely hard to diagnose. Always use `node_script_management` MCP tool.

## Rule 6: Full Verification Loop

Every structural scene change must follow:
```
Query -> Mutate via MCP -> Query -> Save -> Close -> Reopen -> Query -> Validate -> Preview
```
Never assume MCP "success" means the change is correct and persistent.

## Rule 7: Game Data vs Cocos UUID Separation

- Game logic JSON uses human-readable IDs: `"id": "A8"`
- Never store Cocos UUIDs in game data
- Runtime TypeScript uses `@property(Node)` or `getChildByName()`, never `getNodeByUuid()`

## Rule 8: MCP Availability is a Hard Prerequisite

**Before executing ANY task that involves scenes, nodes, prefabs, components, sprites, UI, or asset references, the AI MUST first confirm MCP is running and responsive by calling a simple MCP query (e.g. `scene_management.get_current`).**

If MCP is unavailable, not responding, or connection fails:
- **STOP IMMEDIATELY.** Do not proceed with any Cocos-related work.
- Do not modify TypeScript files that depend on scene/prefab structure.
- Do not create `.scene`, `.prefab`, or `.meta` files.
- Do not hand-write prefab JSON as a workaround.
- Do not guess or fabricate UUIDs.
- Do not use any alternative approach to bypass MCP.
- Report: "MCP 当前不可用，因此没有执行代码或 prefab 修改任务。"
- Wait for user to confirm MCP is available before continuing.

When MCP IS available, only create via code (not MCP):
- TypeScript scripts (`.ts` files)
- Game data JSON files
- Configuration files

All other Cocos asset operations MUST go through MCP.

## Rule 9: Missing Script / Invalid UUID Debugging

When encountering "Missing class" or "Script is missing or invalid":
1. Query the node to find the invalid component
2. Query the actual script asset
3. Remove stale component via MCP
4. Re-attach script via MCP
5. Save -> Close -> Reopen -> Validate

NEVER guess-fix a UUID or manually edit `__type__`.

## Rule 10: Consult Skills Before Acting

Before any Cocos scene work, always read:
- `cocos-ai-best-practices/mcp-first-uuid-integrity.md` (mandatory)
- `cocos-ai-best-practices/scene-guidelines.md`
- `cocos-ai-best-practices/rendering-guidelines.md`
- `cocos-ai-best-practices/common-pitfalls.md`

For 3D asset work (FBX, meshes, materials, textures), also read:
- `cocos-ai-best-practices/3d-asset-integration.md` (mandatory for 3D asset tasks)

These document real failures from this project. Following them prevents repeated mistakes.

## Rule 11: No Default esbuild Validation

esbuild must NOT be used as a default TypeScript validation step in this Cocos project.

After modifying or creating Cocos TypeScript scripts, do NOT automatically run:
- `npx esbuild ...`
- `npm exec esbuild ...`
- Any bundler validation that generates `temp_validate.js`

esbuild is permitted ONLY as an optional diagnostic tool when encountering:
- Unresolvable TypeScript imports
- Broken script dependency chains
- Obvious TypeScript syntax/module errors

If esbuild permission is denied, skip silently and continue development. Never request expanded permissions for esbuild.

Primary validation: Cocos MCP (`check_script`, `component_query`) + Preview.

See `cocos-ai-best-practices/typescript-validation-strategy.md` for the full policy.

## Background

These rules exist because of repeated UUID compression mismatches (base64url `-` vs standard base64 `+`) when AI hand-wrote scene JSON with computed `__type__` values, causing "Missing class" errors at runtime.
