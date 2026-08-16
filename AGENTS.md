# Tower Defense Game — AI 开发指南

## 项目概述

- **引擎**: Cocos Creator 3.8.8 (TypeScript, 2D)
- **类型**: Kingdom Rush 风格塔防游戏
- **参考项目**: `kingdomRush-gxh1996/` (Cocos 2.x 版本，作为逻辑参考)

---

## Skill 索引

| 目录 | 说明 | 优先级 |
|------|------|--------|
| `.kiro/steering/cocos-mcp-first.md` | MCP First 开发规则（强制） | 🔴 必读 |
| `cocos-ai-best-practices/` | AI 辅助 Cocos 开发最佳实践 | 🔴 必读 |
| `cocos-skill-main/` | Cocos Creator 3.8+ 工作流和参考文档 | 🟡 按需 |

### 关键文档

- **MCP + UUID 完整性**: `cocos-ai-best-practices/mcp-first-uuid-integrity.md`
- **开发工作流**: `cocos-ai-best-practices/development-workflow.md`
- **场景规范**: `cocos-ai-best-practices/scene-guidelines.md`
- **常见陷阱**: `cocos-ai-best-practices/common-pitfalls.md`
- **TypeScript 验证策略**: `cocos-ai-best-practices/typescript-validation-strategy.md`
- **渲染规范**: `cocos-ai-best-practices/rendering-guidelines.md`
- **3D 资产集成**: `cocos-ai-best-practices/3d-asset-integration.md`

### 项目设计文档

- **建筑系统**: `builder.md`
- **战斗系统**: `combat.md`
- **核心流程**: `memo.md`
- **怪物系统**: `monster.md`

---

## 核心开发约束

### 约束 1: MCP First（强制）

**所有 Cocos Scene/Prefab 结构操作必须通过 Cocos MCP 工具执行。**

必须使用 MCP 的操作:
- 创建/删除/修改 Scene 中的 Node
- 添加/移除 Component
- 附加/分离 Script
- 设置 Component 属性、Transform、Asset 引用
- 查询 Scene/Node/Component

**绝对不可以直接编辑 `.scene`、`.prefab`、`.meta` 文件。**

### 约束 2: UUID 完整性

**AI 永远不要生成、猜测或硬编码任何 Cocos UUID。** 包括:
- Node UUID, Component UUID, Script Asset UUID
- Asset UUID, SpriteFrame UUID
- 压缩的 `__type__` 值

UUID 必须来自 Cocos Editor 或 MCP 查询结果。

### 约束 3: 参考项目架构

所有塔/子弹/战斗系统**必须参照 `kingdomRush-gxh1996`** 的实现:
- 架构模式: Tower 管理射击循环 → Bullet 管理飞行+命中
- 碰撞检测: 使用距离检测 (`HIT_RADIUS`) 而非物理碰撞
- 敌人查找: 遍历 `EnemyRoot.children`，用 `Vec3.distance` 判定范围
- 伤害: 调用 `KR001EnemyController.injure(damage)`

### 约束 4: MCP 可用性是硬前提

在执行任何涉及 scene/prefab/node/component 的任务之前，**必须先确认 MCP 正在运行**。如果 MCP 不可用:
- 立即停止，不执行任何 Cocos 相关工作
- 只允许创建 TypeScript 脚本文件和 JSON 数据文件
- 报告: "MCP 当前不可用"

---

## 代码风格约束

### 文件命名

- 脚本文件: `KR001XxxYyy.ts` 格式
- 子弹组件: `XxxBullet.ts` (如 `ArrowBullet.ts`, `ArtilleryBullet.ts`)
- 目录按塔类型分: `arrowtower/`, `magiclantower/`, `artillerytower/`, `barracktower/`

### 代码结构

- 常量集中在 `CommonConstant.ts`
- 所有 prefab 路径通过 `CommonConstant` 引用
- Tower → Bullet 架构分离（塔管理射击循环，子弹管理飞行+命中）
- 使用 Cocos 3.x API: `_decorator`, `Vec3`, `tween`, `find`, `instantiate`

### 子弹飞行方式

| 塔类型 | 子弹 | 飞行方式 | 命中方式 |
|--------|------|----------|----------|
| ArrowTower | ArrowBullet | 贝塞尔曲线 + 旋转 | 单体距离检测 |
| MagiclanTower | MagiclanBullet | **直线** | 单体距离检测 |
| ArtilleryTower | ArtilleryBullet | 贝塞尔曲线（抛物线） | AOE 范围爆炸 |
| BarrackTower | KR001Soldier | 步行追踪 | 近战距离检测 |

---

## 参考项目映射表

| 参考项目 (kingdomRush-gxh1996) | 当前项目 (KR001) | 状态 |
|-------------------------------|-------------------|------|
| `tower/arrow/arrowTower.ts` | `arrowtower/KR001ArrowTower.ts` | ✅ 完成 |
| `tower/arrow/arrower.ts` | `arrowtower/KR001Arrower.ts` | ✅ 完成 |
| `tower/arrow/arrowBullet.ts` | `arrowtower/ArrowBullet.ts` | ✅ 完成 |
| `tower/magiclan/magiclanTower.ts` | `magiclantower/KR001MagiclanTower.ts` | ✅ 完成 |
| `tower/magiclan/magiclanBullet.ts` | `magiclantower/MagiclanBullet.ts` | ✅ 完成 |
| `tower/artillery/artilleryTower.ts` | `artillerytower/KR001ArtilleryTower.ts` | 🔧 完善中 |
| `tower/artillery/artilleryBullet.ts` | `artillerytower/ArtilleryBullet.ts` | 🔧 完善中 |
| `tower/barrack/barrack.ts` | `barracktower/KR001BarrackTower.ts` | 🔧 完善中 |
| `tower/barrack/soldier.ts` | `barracktower/KR001Soldier.ts` | 🔧 完善中 |
| `monster/monster.ts` | `KR001EnemyController.ts` | ✅ 基础完成 |
| `creature.ts` | (逻辑内联到各组件) | ✅ |

---

## 场景节点树

```
Canvas
├── MapRoot
│   └── map1 (Sprite)
├── BuildRoot
│   ├── KR001BuildPoint_0 ... N
│   ├── KR001Builder (共享单例)
│   └── Tower_xxx_N (动态生成的塔)
├── EnemyRoot
│   └── KR001Enemy_N (动态生成的敌人)
└── UI (HUD)
```

---

## 验证清单

每次修改后确认:
1. TypeScript 无编译错误
2. 箭塔: 贝塞尔曲线箭矢 + 旋转 + 单体命中 ✓
3. 法师塔: **直线**法球 + 单体命中 ✓
4. 炮塔: 贝塞尔曲线炮弹 + AOE 爆炸 ✓
5. 兵营: 自动出兵 + 追踪 + 近战 + 死亡回收 ✓
