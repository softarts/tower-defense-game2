# Cocos AI Best Practices

## Overview

This skill documents **engineering best practices** for AI-assisted Cocos Creator 3.8+ game development using MCP tools.

It is not an API reference. It captures development workflows, debugging experience, Preview verification patterns, and lessons learned from real development sessions.

## Relationship with cocos-skill-main

| Skill | Responsibility |
|-------|---------------|
| `cocos-skill-main` | MCP API reference, tool capability documentation, Cocos Creator scripting docs, CLI workflows, validation scripts |
| `cocos-ai-best-practices` | Development workflow, Preview-first methodology, debug patterns, rendering pitfalls, scene management guidelines, prompt templates |

## How to Use Together

1. **Start with `cocos-skill-main`** to understand available MCP tools and API patterns.
2. **Follow `cocos-ai-best-practices`** for the development process, validation checkpoints, and debugging methodology.
3. When encountering issues, consult `common-pitfalls.md` and `rendering-guidelines.md` before attempting fixes.
4. Use `prompt-template.md` as a framework for structuring development tasks.

## Contents

- [development-workflow.md](development-workflow.md) — Recommended AI development lifecycle
- [preview-debugging.md](preview-debugging.md) — Preview-first development and debug methodology
- [scene-guidelines.md](scene-guidelines.md) — Scene modification rules and checklists
- [rendering-guidelines.md](rendering-guidelines.md) — Sprite visibility and runtime rendering
- [common-pitfalls.md](common-pitfalls.md) — Known issues and their root causes
- [prompt-template.md](prompt-template.md) — Standard prompt structure and completion criteria

## Contributing

All new development experiences, debug cases, rendering issues, and workflow improvements should be added to this skill. Do not modify `cocos-skill-main` for practice-level content.
