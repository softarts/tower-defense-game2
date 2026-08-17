# 建筑系统设计文档

## 概述

点击空地 → 弹出圆形建筑选择菜单 → 选择建筑类型 → 在空地位置实例化建筑 → 隐藏空地标记。
各防御塔实例化后自动挂载对应的控制脚本，开启索敌与攻击逻辑。

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
| `KR001BuildPoint.ts` | 管理单个建造位置，响应点击，加载/实例化塔 prefab，触发兵营出兵 |
| `KR001Builder.ts` | 管理圆形菜单的显示/隐藏，注册按钮事件，通知 BuildPoint |
| `KR001ArtilleryTower.ts` | 炮塔索敌、射击冷却控制、实例化炮弹并计算弹道时间 |
| `ArtilleryBullet.ts` | 炮弹二次贝塞尔弧线飞行、终点序列帧爆炸动画与 AOE 伤害 |
| `KR001BarrackTower.ts` | 兵营生命周期管理、驻点分配、即时出兵与阵亡补兵逻辑 |
| `KR001Soldier.ts` | 士兵近战 AI：巡逻驻点、索敌追踪、交战锁定、受击与死亡回收 |
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
│   → if (buildType === 'barrack') initStations() 立即出兵 4 个    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 炮塔建造、弹道计算与爆炸效果详解

### 1. 炮塔建造与索敌机制
- **建造与加载**：玩家在建造圆环中点击下方的 `artillery` 按钮后，`KR001BuildPoint` 异步加载并实例化 `ArtilleryTower.prefab`。
- **索敌流程** (`KR001ArtilleryTower.ts`)：
  - 炮塔在每帧 `update` 中遍历 `EnemyRoot` 下的所有存活敌人。
  - 计算自身与敌人的世界坐标欧氏距离 `Vec3.distance(towerPos, enemyPos)`。
  - 当距离小于等于射程 `ARTILLERY_SHOOT_RANGE` 且处于可射击状态（`_canShoot === true`）时，锁定该敌人并发射炮弹。
  - 发射后进入 `ARTILLERY_COOLDOWN` 冷却（3.0秒），冷却完毕后允许下一轮发射。

### 2. 抛物线弹道计算 (Quadratic Bézier Curve)
炮弹（`ArtilleryBullet.ts`）模拟真实的加农炮抛物线发射轨迹：
1. **坐标转换**：
   - 将发射点世界坐标 `startWorld` 与目标落地点 `endWorld` 转换为炮弹父节点（`BuildRoot`）的本地空间坐标 `P0` 与 `P2`。
2. **控制点 `P1` 计算（抛物线顶点）**：
   - 水平控制点位于起点与终点的中点：`midX = localStart.x + (localEnd.x - localStart.x) / 2`。
   - 垂直控制点在终点上方抬高 60 个像素，形成高抛弧线：`controlY = localEnd.y + 60`。
   - 若竖直方向几乎重合，则向右偏移 30 像素避免垂直轨迹生硬。
3. **飞行时间与插值计算**：
   - 飞行时长 `flightTime = distance / ARTILLERY_BULLET_SPEED`。
   - 每帧累加 `dt` 计算插值进度 $t = \text{elapsed} / \text{duration} \in [0, 1]$。
   - 采用二次贝塞尔方程更新炮弹每帧坐标：
     $$B(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2$$

### 3. 序列帧爆炸效果实现
严格参考 `kingdomRush-gxh1996` 的 `artilleryBullet` 表现：
1. **预加载爆炸序列帧**：
   - 炮弹在 `onLoad` 期间异步预加载 10 张爆炸帧图片：`textures/tower/bullet/bomb/bom1` ~ `bom10`。
2. **触地触发爆炸**：
   - 当插值进度 $t \ge 1$ 到达终点时，停止飞行，进入爆炸状态 `_exploding = true`。
   - 隐藏原有炮弹贴图，切换并显示爆炸第一帧 `bom1`。
3. **逐帧播放动画**：
   - 按照每帧 0.1s 的播放间隔（`EXPLODE_FRAME_SPEED = 0.1`）依次切换 `bom1` → `bom2` → ... → `bom10`。
4. **范围 AOE 伤害与销毁**：
   - 10 帧播放完毕后触发 `_onExplosionEnd()`。
   - 调用 `causeHarm()` 遍历所有存活敌人，若敌人世界坐标与爆炸中心距离 $\le \text{bombRange}$，则执行 `enemy.injure(attack)` 扣血。
   - 伤害判定完毕后调用 `this.node.destroy()` 彻底销毁炮弹节点。

---

## 兵营建造与 4 名士兵生成详解

### 1. 兵营建造流程
- 玩家点击建造菜单顶部的 `barrack` 按钮。
- `KR001BuildPoint` 实例化 `BarrackTower.prefab`，挂载 `KR001BarrackTower` 控制脚本。
- 调用 `barrack.initStations()` 初始化兵营的所有士兵驻守点。

### 2. 4 名士兵即时生成机制
- **最大士兵数配置**：`BARRACK_MAX_SOLDIERS = 4`。
- **驻守点分布 (`initStations`)**：
  - 以兵营世界坐标为中心，在兵营正下方 `BARRACK_SOLDIER_OFFSET_Y` (-16px) 处，按间距 `SOLDIER_SPREAD` (12px) 均匀排布 4 个驻守位置，索引为 `[0, 1, 2, 3]`。
- **零延迟即时出兵**：
  - 兵营建成的首帧（`scheduleOnce 0.1s`，待士兵预制体加载完毕后），立即执行循环批量调用 `spawnSoldier()` 4 次，无需等待冷却。
- **士兵生成与分配**：
  - 实例化 `Soldier.prefab` 并挂载至 `BuildRoot`。
  - 士兵生成初始位置位于兵营出兵口（`outPos` = 兵营坐标 + (2, -16)）。
  - 从可用驻点栈 `_availableStations` 中弹出一个驻点索引并分配给该士兵。
  - 调用 `soldier.init(stationIndex, stationPos, barrack, enemyRoot)` 启动士兵 AI，士兵自主走向被分配的驻守点。

### 3. 士兵阵亡与补充机制
- 当某个士兵在战斗中死亡后，调用 `barrack.releaseSoldier(soldier)`。
- 兵营回收该士兵占用的驻点编号 `stationNo` 放回 `_availableStations`。
- 兵营进入 `BARRACK_SPAWN_COOLDOWN`（5.0秒）补兵冷却。
- 冷却结束后，`update()` 检测到当前活跃士兵数 `< 4` 且有可用驻点，自动补充训练新的士兵走往该驻点。

---

## 关键设计决策

1. **单例 Builder**：整个场景只有一个 KR001Builder 实例，在所有 BuildPoint 之间共享复用。
2. **动态加载**：所有 prefab 通过 `resources.load()` 动态加载，路径统一管理在 `CommonConstant`。
3. **坐标一致性**：塔与士兵实例化后放在 BuildRoot 下，与 BuildPoint 同级同坐标系，直接复用 position。
4. **弹道分离**：塔只负责索敌与发射计时，飞行与爆炸效果由子弹独立封装驱动。
5. **状态锁定**：BuildPoint._isBuilt = true 后不再响应点击。

## 图片资源位置

所有建筑与子弹相关图片在 `assets/resources/textures/tower/`:

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
├── bullet/
│   ├── arrow.png           (箭矢)
│   ├── magiclan_bullet.png (魔法球)
│   ├── pao1_bullet.png     (1级炮弹)
│   ├── pao2_bullet.png     (2级炮弹)
│   └── bomb/
│       ├── bom1.png ~ bom10.png (10帧爆炸序列动画)
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
PREFAB_ARTILLERY_BULLET = 'prefabs/tower/ArtilleryBullet';
```
