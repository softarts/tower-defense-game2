# TypeScript Validation Strategy

## Core Principle

**Cocos Creator Runtime is the source of truth for project correctness, not a generic JavaScript bundler.**

esbuild is a general-purpose bundler that does not understand Cocos Creator's module system, decorator metadata, or runtime class registration. It cannot validate whether a script will work correctly in a Cocos scene.

---

## Rule: esbuild is NOT a Default Validation Step

After creating or modifying Cocos TypeScript scripts, the agent must NOT automatically execute:

- `npx esbuild ...`
- `npm exec esbuild ...`
- Any esbuild command to generate `temp_validate.js`
- Any bundler-based validation as a default step

### Forbidden Default Behaviors

- Running esbuild after every script change
- Generating `temp_validate.js` as part of normal workflow
- Blocking development tasks because esbuild permission is denied
- Requesting broader shell/PowerShell permissions to run esbuild
- Adding permissive permission rules (e.g., `execute_pwsh *`) to enable esbuild

---

## When esbuild MAY Be Used (Diagnostic Only)

esbuild is permitted ONLY as an optional diagnostic tool when encountering specific, clearly identified problems:

| Situation | esbuild Appropriate? |
|-----------|---------------------|
| Normal script creation | No |
| Normal script modification | No |
| TypeScript import cannot be resolved | Yes (diagnostic) |
| Script dependency chain is broken | Yes (diagnostic) |
| Obvious TypeScript syntax/module error | Yes (diagnostic) |
| Need to verify if a script can be statically bundled | Yes (diagnostic) |
| Script works in Editor but fails in build | Yes (diagnostic) |
| Routine development workflow | No |
| Permission denied for esbuild | Skip silently |

### If esbuild Permission is Denied

- Do NOT retry
- Do NOT request expanded permissions
- Do NOT modify workspace permission configuration
- Simply skip and continue with the standard Cocos validation flow

---

## Default Validation Flow (Replaces esbuild)

The correct validation sequence for Cocos TypeScript scripts:

```
Code Modification
    |
Cocos MCP Script Validation
    |  - check_script (verify compilation)
    |  - asset_query (verify asset exists)
    |
Script Attachment Validation
    |  - node_script_management (attach)
    |  - component_query (verify attached)
    |
Scene Validation
    |  - Save Scene
    |  - Close Scene
    |  - Reopen Scene
    |  - Query nodes/components (verify persistence)
    |  - Check: no Missing Script
    |  - Check: no Invalid Script UUID
    |  - Check: no Invalid Component
    |
Cocos Creator Preview
    |  - Verify actual runtime behavior
    |  - Confirm gameplay functions correctly
    |
Done
```

---

## Script Validation Checklist

For every Cocos TypeScript script, validate using MCP:

1. **Script Asset exists** — `asset_query` confirms the script is in the asset database
2. **Script compiles** — `check_script` returns success
3. **Script can be attached** — `node_script_management` succeeds
4. **Component appears on node** — `component_query` lists the script component
5. **Scene has no missing scripts** — Scene hierarchy shows no errors
6. **Scene has no invalid UUIDs** — No stale references after reopen
7. **Runtime behavior works** — Preview confirms expected behavior

If MCP can complete checks 1-6, esbuild is unnecessary.

---

## Scene Validation (After Script Changes)

When scripts are modified and attached to scene nodes:

```
Save Scene
    -> Close Scene
    -> Reopen Scene
    -> Validate (check for):
        - Missing Script
        - Invalid Script UUID
        - Invalid Component
        - Node UUID inconsistency
        - Script Attachment loss
        - Missing Asset references
```

These are real issues that occurred in this project. They cannot be detected by esbuild.

---

## Runtime Verification

Gameplay features must be verified through Cocos Creator Preview:

- Player movement
- Enemy movement
- Waypoint navigation
- Tower placement
- Tower attack behavior
- Bullet/projectile movement
- Animation playback
- Collision detection
- Physics interactions

esbuild cannot verify any of these. Only Cocos Creator Preview provides meaningful runtime validation.

---

## temp_validate.js Policy

- Do NOT generate `temp_validate.js` during normal Cocos development
- If `temp_validate.js` exists from a previous session, it is a temporary artifact
- `temp_validate.js` has no business purpose in the game runtime
- It should not be committed to version control
- It may be deleted if found in the project root

---

## Relationship to Existing Rules

This rule complements (does not replace) existing rules:

- **MCP First** — Scene operations via MCP (unchanged)
- **UUID Integrity** — Never generate UUIDs (unchanged)
- **Scene Mutation Verification** — Save -> Close -> Reopen -> Validate (unchanged)
- **Game Data vs Cocos UUID Separation** — Human IDs in game data (unchanged)
- **Preview/Gameplay Validation** — Runtime testing required (unchanged)

This rule adds:

> "esbuild is optional and diagnostic-only. Cocos MCP + Preview is the primary validation method."

---

## Summary

| Aspect | Rule |
|--------|------|
| Default esbuild execution | Disabled |
| esbuild as diagnostic | Allowed (specific cases only) |
| Primary script validation | Cocos MCP (check_script, component_query) |
| Primary runtime validation | Cocos Creator Preview |
| temp_validate.js | Do not generate; delete if found |
| Permission escalation for esbuild | Forbidden |
| Blocking tasks for esbuild | Forbidden |
