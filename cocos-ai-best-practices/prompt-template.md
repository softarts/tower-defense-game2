# Prompt Template

## Recommended Development Workflow

Every development task should follow this sequence:

```
Read Skill (understand tools and best practices)
    ↓
Scene Query (understand current scene state)
    ↓
Scene Modify (create/update nodes via MCP)
    ↓
Code Generate (write TypeScript scripts)
    ↓
Attach Script (bind to nodes)
    ↓
Save (persist changes)
    ↓
Validation (0 errors, scripts registered)
    ↓
Preview (run in browser)
    ↓
Visual Check (does it look right?)
    ↓
Debug (fix issues if any)
    ↓
Finish (all criteria met)
```

## Preview Checklist

Before declaring a feature complete, verify in Preview:

- [ ] Node visible on screen
- [ ] Sprite renders correctly (not placeholder icon)
- [ ] Position matches specification
- [ ] Size matches specification
- [ ] Color matches specification
- [ ] Movement works (if applicable)
- [ ] Physics works (if applicable)
- [ ] Collision works (if applicable)
- [ ] Animation plays (if applicable)
- [ ] Console has no errors
- [ ] Validation passes

## Completion Criteria

A task is **only complete** when ALL of the following are satisfied:

| Criterion | Verification Method |
|-----------|-------------------|
| Validation PASS | `check_ready` = true, `get_logs(error)` = 0, `check_dirty` = false |
| Preview PASS | User confirms Preview runs without error |
| Visual PASS | User confirms visual output matches specification |

If any criterion fails, the task is NOT complete. Debug and iterate.

## Task Structure Template

When receiving a development task, structure the work as:

### 1. Understand

- What nodes need to exist?
- What components do they need?
- What scripts are required?
- What behavior is expected?

### 2. Plan

- What is the node hierarchy?
- What is the creation order?
- What dependencies exist between scripts?

### 3. Execute (Incrementally)

For each feature:
1. Create nodes via MCP
2. Add components via MCP
3. Configure properties via MCP
4. Write script
5. Attach script
6. Save
7. Validate
8. Preview
9. Confirm

### 4. Verify

- Run through Preview Checklist
- Confirm Completion Criteria
- Report results

## Error Recovery Template

When Preview fails:

```
1. What is the symptom? (describe what you see)
2. Query scene state (nodes, components, properties)
3. Compare expected vs actual
4. Identify root cause
5. Apply minimal fix
6. Save and re-preview
7. Confirm resolution
```

## Reporting Template

After completing a task, report:

```
## Scene Hierarchy
[tree structure]

## Components
[per-node component list]

## Scripts
[file list with descriptions]

## Preview Result
[checklist with ✔/✘]

## Status
PASS or FAIL (with details)
```
