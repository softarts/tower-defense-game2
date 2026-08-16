# 建筑系统设计文档

## 概述

点击空地 → 弹出圆形建筑选择菜单 → 选择建筑类型 → 在空地位置实例化建筑 → 隐藏空地标记。

## Prefab 清单

### 建造系统

| Prefab | 路径 | 用途 |
|--------|------|------|
| KR001BuildPoint | `prefabs/builder/KR001BuildPoint.prefab` | 可建造空地标记 |
| KR001Builder | `prefabs/builder/KR001Builder.prefab` | 圆形建筑选择菜单 |

### 建筑 Prefab

| Prefab | 路径 | 结构 |
|--------|------|------|
| ArrowTower | `prefabs/tower/ArrowTower.prefab` | root → bg(arrow_bg, 72×63, pos 0,17.8) + leftPerson(arrow_idle_up, pos -6,50) + rightPerson(arrow_idle_up, pos 9,50) |
| BarrackTower | `prefabs/tower/BarrackTower.prefab` | root → bg(bing1_0, 72×54, pos 1.6,14.7) |
| MagiclanTower | `prefabs/tower/MagiclanTower.prefab` | root → bg(fashi_0, 72×63, pos -0.2,15) + magiclan(magiclan_idle, 30×30, pos -0.2,46) |
| ArtilleryTower | `prefabs/tower/ArtilleryTower.prefab` | root → bg(pao1_0, 72×50, pos 0,19.8) |
| Soldier | `prefabs/tower/Soldier.prefab` | root → bg(walk1_0, pos 0,9.2) |

### KR001Builder.prefab 内部结构

```
KR001Builder (KR001Builder.ts)
└── buildFace (初始 active=false)
    ├── bg (build_ring.png, 圆环背景, scale 0.4, pos -5,5)
    └── g1 (4个建筑按钮容器)
        ├── arrow    (build_arrow_icon, pos -49,3.52, scale 0.4)  ← 左
        ├── barrack  (build_bing_icon,  pos -4.4,50.6, scale 0.4) ← 上
        ├── magiclan (build_fasi_icon,  pos 39.08,3.52, scale 0.4) ← 右
        └── artillery(build_zd_icon,    pos -4.4,-38.2, scale 0.4) ← 下
```

## TypeScript 文件

| 文件 | 职责 |
|------|------|
| `KR001SceneSetup.ts` | 场景初始化，加载 levelConfig，实例化 BuildPoint 和 Builder |
| `KR001BuildPoint.ts` | 管理单个建造位置，响应点击，加载/实例化塔 prefab，生成士兵 |
| `KR001Builder.ts` | 管理圆形菜单的显示/隐藏，注册按钮事件，通知 BuildPoint |
| `CommonConstant.ts` | 集中管理所有资源路径和游戏常量 |
| `LevelDataManager.ts` | 加载关卡配置（含 posOfBuilders） |

## 事件触发流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 场景启动                                                         │
│ KR001SceneSetup.start()                                         │
│   → LevelDataManager.loadLevel(1)                               │
│   → createBuildPoints()                                         │
│       → resources.load(PREFAB_BUILD_POINT)                      │
│       → resources.load(PREFAB_BUILDER)                          │
│       → instantiate(builderPrefab) → 创建唯一 KR001Builder 实例   │
│       → for each posOfBuilders[i]:                              │
│           instantiate(buildPointPrefab)                          │
│           setPosition(pos.x, pos.y)                             │
│           buildPointComp.init(i)                                │
│           buildPointComp.setBuilder(builder)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 用户点击空地                                                      │
│                                                                  │
│ KR001BuildPoint.onLandClicked(event)                            │
│   ← land 节点 TOUCH_END 事件                                    │
│   → if (_isBuilt) return  // 已建造则忽略                        │
│   → _builder.show(this)                                         │
│                                                                  │
│ KR001Builder.show(buildPoint)                                   │
│   → setWorldPosition(buildPoint 世界坐标)                        │
│   → buildFace.active = true                                     │
│   → g1.active = true                                            │
│   → tween scale 0→1 (backOut 弹出动画)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 用户点击建筑按钮                                                  │
│                                                                  │
│ KR001Builder.onBuildClicked(buildType)                          │
│   ← g1 子节点 (arrow/barrack/magiclan/artillery) TOUCH_END      │
│   → _currentBuildPoint.onBuildSelected(buildType)               │
│   → hideImmediately()  // 立即隐藏菜单                           │
│                                                                  │
│ KR001BuildPoint.onBuildSelected(buildType)                      │
│   → CommonConstant.TOWER_PREFAB_MAP[buildType] → prefabPath     │
│   → resources.load(prefabPath, Prefab)                          │
│   → instantiate(prefab)                                         │
│   → parent.addChild(towerNode)                                  │
│   → towerNode.setPosition(this.node.getPosition())              │
│   → _isBuilt = true                                            │
│   → hideLand()  // UIOpacity.opacity = 0                        │
│   → if (buildType === 'barrack') spawnSoldiers()                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 兵营特殊逻辑：生成士兵                                            │
│                                                                  │
│ KR001BuildPoint.spawnSoldiers()                                 │
│   → resources.load(PREFAB_SOLDIER)                              │
│   → for i in 0..3:                                             │
│       instantiate(soldierPrefab)                                │
│       soldier.setPosition(barrack下方展开)                       │
│       parent.addChild(soldier)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 关键设计决策

1. **单例 Builder**：整个场景只有一个 KR001Builder 实例，在所有 BuildPoint 之间共享复用
2. **动态加载**：所有 prefab 通过 `resources.load()` 动态加载，路径统一管理在 CommonConstant
3. **坐标一致性**：塔实例化后放在 BuildRoot 下，与 BuildPoint 同级同坐标系，直接复用 position
4. **无金钱检查**：当前版本无条件允许建造
5. **状态锁定**：BuildPoint._isBuilt = true 后不再响应点击

## 图片资源位置

所有建筑相关图片在 `assets/resources/textures/tower/`:

```
textures/tower/
├── arrowTower/
│   ├── arrow_bg.png        (箭塔建筑 72×63)
│   └── arrow_idle_up.png   (弓箭手 18×18)
├── barrack/
│   └── bing1_0.png         (兵营建筑 72×54)
├── magiclanTower/
│   ├── fashi_0.png         (法师塔建筑 72×63)
│   └── magiclan_idle.png   (法师角色 30×30)
├── artilleryTower/
│   └── pao1_0.png          (炮塔建筑 72×50)
└── soldier/
    └── walk1_0.png         (士兵 14×18)
```

## CommonConstant 中的路径映射

```typescript
TOWER_PREFAB_MAP = {
    'arrow':     'prefabs/tower/ArrowTower',
    'barrack':   'prefabs/tower/BarrackTower',
    'magiclan':  'prefabs/tower/MagiclanTower',
    'artillery': 'prefabs/tower/ArtilleryTower',
};
PREFAB_SOLDIER = 'prefabs/tower/Soldier';
```
