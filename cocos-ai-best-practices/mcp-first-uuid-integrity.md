# MCP First + UUID Integrity

## Origin

This rule set was established after repeated incidents where AI hand-wrote `.scene` files with self-generated UUIDs and self-computed UUID compression (`__type__` values). The AI used base64url encoding (`-` instead of `+`) which doesn't match Cocos Creator's actual standard base64 encoding for UUID compression. Result: `Missing class: d5e6feoucBNHi86S1xtfo-Q` because the runtime registered the class as `d5e6feoucBNHi86S1xtfo+Q`.

**Core lesson**: AI must not simulate Cocos internal serialization. UUID generation, compression, `__type__` mapping, and scene serialization are Cocos Editor internals with undocumented implementation details that differ from assumptions.

---

## MCP First Principle

**All Cocos Scene structural operations must go through Cocos MCP when available.**

AI should operate the Cocos Editor, not treat `.scene` files as ordinary JSON/DSL to generate.

### Operations that MUST use MCP (when supported)

| Category | Operations |
|----------|-----------|
| Scene | Open, Close, Save, Reopen, Validate |
| Node | Create, Delete, Rename, Set Parent, Reparent, Set Active, Set Layer |
| Component | Add, Remove, Set Property |
| Script | Attach, Detach, Query |
| Transform | Set Position, Set Rotation, Set Scale |
| Asset Reference | Set SpriteFrame, Set Material, Set Prefab |
| Query | Query Scene, Query Node, Query Component |

### What AI must NEVER do to .scene files

- Create or modify Node hierarchy
- Create or modify Node/Component UUIDs
- Create or modify Script references (`__type__`)
- Create or modify Asset references (`__uuid__`)
- Create or modify `__id__` references
- Construct serialized Component data

---

## UUID Integrity Rule

**AI must never generate, guess, or hardcode any Cocos UUID.**

This includes:

- Node UUID (`_id` field in scene JSON)
- Component UUID (CID)
- Script Asset UUID (from `.meta` files)
- Asset UUID (images, prefabs, materials)
- SpriteFrame UUID (`__uuid__` references)
- Compressed Script UUID (`__type__` field)

### Why

Cocos Creator's UUID system has internal implementation details that are not fully documented:

1. **UUID compression** uses standard base64 (with `+`/`/`), NOT base64url (with `-`/`_`)
2. The first 5 hex characters are kept, remaining bytes are base64-encoded with trailing padding trimmed
3. The exact padding/trimming rules have edge cases that are easy to get wrong
4. `.meta` file UUIDs must be valid v4 UUIDs with correct variant bits
5. The Editor maintains internal UUID databases that must stay consistent

### Correct Flow

```
Create asset via Editor/MCP
    -> Editor assigns real UUID
    -> Query to get UUID
    -> Use that UUID in subsequent operations
```

### Incorrect Flow (FORBIDDEN)

```
AI generates UUID (e.g., "a1b2c3d4-e5f6-4a7b-...")
    -> Writes .meta file
    -> Computes compressed __type__
    -> Writes into .scene JSON
    -> Hopes Cocos will load it correctly
```

---

## Script Attachment Rule

**Scripts must be attached to nodes via MCP, never by editing .scene JSON.**

### Correct Flow

1. Create script file (TypeScript)
2. Let Cocos Editor compile the script
3. Verify compilation: `check_script`
4. Query target node
5. Attach script via MCP: `node_script_management`
6. Query component to confirm attachment
7. Configure `@property` values via `set_component_property`
8. Save scene
9. Close -> Reopen -> Validate

### Why Direct .scene Editing Fails for Scripts

The `__type__` field in scene JSON requires the compressed UUID of the script asset. This compression involves:

- Hex-to-binary conversion of the UUID
- Standard base64 encoding (NOT base64url)
- Custom padding/trimming rules
- The result must exactly match what `_cclegacy._RF.push()` registers at runtime

Getting any of these steps wrong results in "Missing class" or "Script is missing or invalid" errors that are difficult to diagnose.

---

## Scene Mutation Verification

**Every structural Scene change must follow the full verification loop:**

```
Query (understand current state)
    |
Mutate via MCP
    |
Query (confirm change applied)
    |
Save Scene
    |
Close Scene
    |
Reopen Scene
    |
Query (confirm persistence)
    |
Validate (0 errors)
    |
Preview (if task requires)
```

### Why Close -> Reopen is mandatory

A change might appear successful immediately after MCP mutation, but:
- The change might not persist to the serialized `.scene` file
- The scene might have internal reference inconsistencies only visible after deserialization
- Script components might fail to resolve after reload

### Never assume success

- MCP returning "success" does not mean the change is correct and persistent
- Node existing in hierarchy does not mean it will render
- Script attached does not mean it will execute

---

## Game Data vs Cocos Internal Data

### Separation Rule

| Data Type | Who Creates | Who Manages | Can AI Edit? |
|-----------|-------------|-------------|--------------|
| Game logic JSON (level01.json, etc.) | AI / Designer | AI / Designer | Yes |
| .scene files | Cocos Editor | Cocos Editor | No (use MCP) |
| .prefab files | Cocos Editor | Cocos Editor | No (use MCP) |
| .meta files | Cocos Editor | Cocos Editor | No |
| Node/Component UUIDs | Cocos Editor | Cocos Editor | No |

### Game ID vs Cocos UUID

```json
// CORRECT - Game logic uses human-readable IDs
{ "id": "A8", "x": 258, "y": 154 }

// INCORRECT - Game logic uses Cocos UUID
{ "id": "0dJvqhv+JNB4G1DUSPam4t", "x": 258, "y": 154 }
```

### Runtime Code

TypeScript game logic must NOT depend on Cocos UUIDs for finding objects:

```typescript
// INCORRECT
const player = getNodeByUuid("0dJvqhv+JNB4G1DUSPam4t");

// CORRECT
@property(Node)
player: Node | null = null;

// CORRECT
const player = this.node.parent?.getChildByName('Player');
```

---

## Debugging Missing Script / Invalid Reference

When encountering:
- "Missing Script"
- "Script is missing or invalid"
- "Missing class: xxxxx"
- "Invalid UUID"

### Diagnosis Flow

1. **Query the node** - identify which component has the invalid reference
2. **Query the script asset** - does the script exist? Is it compiled?
3. **Check the `__type__`** - compare scene's `__type__` with what `_RF.push()` actually registers (check `temp/programming/packer-driver/targets/preview/chunks/`)
4. **Identify the mismatch** - usually a UUID compression encoding issue

### Fix Flow

1. Remove the invalid/stale component via MCP
2. Re-attach the script via MCP (which uses the correct UUID)
3. Query to confirm
4. Save -> Close -> Reopen -> Validate

### NEVER

- Guess a replacement UUID
- Manually edit the `__type__` field (even if you think you know the correct value)
- Assume the base64 encoding rules without verification

---

## When MCP is Unavailable

If Cocos MCP is not running or not available for the current session:

1. **Prefer creating only code files** (TypeScript, JSON game data)
2. **Do NOT hand-write .scene files** - defer scene assembly to when MCP is available
3. **If scene creation is absolutely required**, document it as a known-risk operation and:
   - Validate JSON structure with `validate-cocos-json.sh`
   - Warn that script `__type__` values may need to be corrected via MCP after opening in Editor
   - Plan for a "fix-up" step using MCP once Editor is available
4. **Never generate .meta files** - let Cocos Editor create them on first import

### Acceptable without MCP

- Writing TypeScript scripts (`.ts` files)
- Writing game data JSON files
- Writing configuration files

> **Note**: esbuild is NOT a default validation step. See `typescript-validation-strategy.md` for details. esbuild may only be used as an optional diagnostic tool for specific import/dependency issues.

### Requires MCP or Editor

- Creating scene hierarchy
- Attaching scripts to nodes
- Setting asset references (SpriteFrame, Material)
- Configuring component properties in scene
- Any operation involving UUIDs

---

## Case Study: Phase 3 MapDebug Missing class Error

### What Happened

1. AI created `MapDebug.ts` with UUID `d5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f90`
2. AI computed compressed `__type__` as `d5e6feoucBNHi86S1xtfo-Q` (using base64url)
3. Cocos Creator compiled the script and registered it as `d5e6feoucBNHi86S1xtfo+Q` (standard base64)
4. Single character difference (`-` vs `+`) caused "Missing class" at runtime

### Root Cause

The UUID bytes, when base64-encoded, use `+` in standard base64 but `-` in base64url. Cocos Creator uses standard base64 for its UUID compression. A single character mismatch makes the class unresolvable.

### Correct Resolution

Do not compute `__type__` manually. Let Cocos Editor/MCP handle script attachment, which uses the correctly-computed compressed UUID internally.

### Lesson

Even if AI can reverse-engineer the UUID compression algorithm and get it right 95% of the time, the remaining 5% of edge cases (like `+` vs `-`) will cause silent failures that are extremely difficult to diagnose without access to the compiled script registry.
