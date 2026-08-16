# 项目核心流程文档

## 资源加载清单

### 加载时机与调用关系

```
KR001SceneSetup.start()
    ↓
LevelDataManager.loadLevel(1)
    → resources.load('level1/levelConfig', JsonAsset)
    → 返回 LevelData (posOfBuilders, roadNum, noOfRound, timeOfRound, stationOfSoldier)
    ↓
KR001SceneSetup.createBuildPoints()
    → resources.load('prefabs/builder/KR001BuildPoint', Prefab)
    → resources.load('prefabs/builder/KR001Builder', Prefab)
    ↓
KR001EnemySpawner.start()  (EnemyRoot 上的组件，独立启动)
    → resources.load('gameConfig', JsonAsset)       ← 读取 monsterData[0].speedOfMove
    → PathLoader.load('road1')
        → resources.load('level1/road1', JsonAsset)
    → EnemyFactory.preload()
        → resources.load('prefabs/enemy/KR001Enemy', Prefab)
```

### 资源文件列表

| 资源文件 | 加载路径 | 加载者 | 内容 |
|---------|---------|--------|------|
| `resources/gameConfig.json` | `'gameConfig'` | KR001EnemySpawner | 全局配置：怪物属性、塔属性、士兵属性 |
| `resources/level1/levelConfig.json` | `'level1/levelConfig'` | LevelDataManager | 关卡配置：建筑点坐标、波次、时间 |
| `resources/level1/road1.json` | `'level1/road1'` | PathLoader | 路径1: 敌人行走路线坐标点 |
| `resources/level1/road2.json` | `'level1/road2'` | PathLoader | 路径2 |
| `resources/level1/road3.json` | `'level1/road3'` | PathLoader | 路径3 |
| `resources/prefabs/builder/KR001BuildPoint.prefab` | `'prefabs/builder/KR001BuildPoint'` | KR001SceneSetup | 可建造空地标记 |
| `resources/prefabs/builder/KR001Builder.prefab` | `'prefabs/builder/KR001Builder'` | KR001SceneSetup | 圆形建筑选择菜单 |
| `resources/prefabs/enemy/KR001Enemy.prefab` | `'prefabs/enemy/KR001Enemy'` | EnemyFactory | 敌人预制体 |
| `resources/prefabs/tower/ArrowTower.prefab` | `'prefabs/tower/ArrowTower'` | KR001BuildPoint | 箭塔 |
| `resources/prefabs/tower/BarrackTower.prefab` | `'prefabs/tower/BarrackTower'` | KR001BuildPoint | 兵营 |
| `resources/prefabs/tower/MagiclanTower.prefab` | `'prefabs/tower/MagiclanTower'` | KR001BuildPoint | 法师塔 |
| `resources/prefabs/tower/ArtilleryTower.prefab` | `'prefabs/tower/ArtilleryTower'` | KR001BuildPoint | 炮塔 |
| `resources/prefabs/tower/Soldier.prefab` | `'prefabs/tower/Soldier'` | KR001BuildPoint | 士兵 |
| `resources/prefabs/tower/ArrowBullet.prefab` | `'prefabs/tower/ArrowBullet'` | KR001ArrowTower | 箭矢子弹 |
| `resources/prefabs/tower/MagiclanBullet.prefab` | `'prefabs/tower/MagiclanBullet'` | KR001MagiclanTower | 法球子弹 |
| `resources/prefabs/tower/ArtilleryBullet.prefab` | `'prefabs/tower/ArtilleryBullet'` | KR001ArtilleryTower | 炮弹子弹 |

---

## gameConfig.json 结构

参考项目加载方式：
- 参考项目在游戏启动场景通过 `cc.loader.loadRes('json/gameConfig', ...)` 加载
- 然后调用 `GameDataStorage.init(jsonObject)` 初始化全局单例
- 之后所有脚本通过 `GameDataStorage.getGameConfig().getMonsterData()` 等方法访问

当前项目加载方式：
- `KR001EnemySpawner.start()` 中 `resources.load('gameConfig', JsonAsset)`
- 读取 `monsterData[0].speedOfMove` 作为敌人速度

```json
{
    "monsterData": [
        {
            "no": 0,
            "HP": 30,
            "speedOfMove": 25,        ← 敌人行走速度 (px/s)
            "intervalOfAttack": 1,
            "aggressivity": 10,
            "rangeOfAttack": 15,
            "rangeOfInvestigate": 50,
            "intervalOfThink": 1,
            "price": 10
        }
    ],
    "dataOfTower": { ... },
    "soldierData": [ ... ]
}
```

---

## levelConfig.json 结构

```json
{
    "roadNum": 3,
    "posOfBuilders": [
        {"x": -107, "y": -41},
        {"x": -168, "y": 98}
    ],
    "noOfRound": [[0,0], [0,0,0], [0,0,0]],
    "timeOfRound": [5, 10, 10],
    "stationOfSoldier": [...]
}
```

---

## road1/road2/road3.json 结构

```json
{
    "name": "road1",
    "sampleDistance": 5,
    "coordinateSystem": "cocos-node-local",
    "points": [
        {"x": -350, "y": 50},
        {"x": -200, "y": 50},
        ...
    ]
}
```

每个 road 文件包含一条预采样路径，points 数组中的坐标是 Cocos 节点本地空间（原点居中，Y 轴向上）。

---

## 点击空地 → 显示圆形建筑菜单 调用过程

### 整体流程

```
用户手指触碰 land 节点
        │
        ▼
┌─────────────────────────────────────────────┐
│  KR001BuildPoint.ts                         │
│  onLandClicked(event)                       │
│    → this._builder.show(this)               │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  KR001Builder.ts                            │
│  show(buildPoint)                           │
│    → 移动自身到 buildPoint 世界坐标          │
│    → buildFace.active = true                │
│    → g1.active = true                       │
│    → tween scale 0→1 (backOut 弹出动画)      │
└─────────────────────────────────────────────┘
```

### 涉及文件与职责

| 文件 | 职责 |
|------|------|
| `assets/scripts/kr001/KR001SceneSetup.ts` | 场景初始化，加载 prefab，创建 BuildPoint 和 Builder |
| `assets/scripts/kr001/KR001BuildPoint.ts` | 单个建造位置，响应点击，加载/实例化塔，生成士兵 |
| `assets/scripts/kr001/KR001Builder.ts` | 圆形菜单显示/隐藏，注册按钮事件，通知 BuildPoint |
| `assets/scripts/kr001/CommonConstant.ts` | 集中管理所有资源路径和游戏常量 |
| `assets/scripts/kr001/LevelDataManager.ts` | 加载关卡配置（含 posOfBuilders） |

### 关键函数

| 函数 | 文件 | 作用 |
|------|------|------|
| `createBuildPoints()` | KR001SceneSetup.ts | 加载 prefab → 实例化 Builder(1个) → 实例化 BuildPoint(N个) → setBuilder() |
| `onLandClicked(event)` | KR001BuildPoint.ts | land TOUCH_END 回调 → builder.show(this) |
| `setBuilder(builder)` | KR001BuildPoint.ts | 接收共享 Builder 引用 |
| `show(buildPoint)` | KR001Builder.ts | 移动位置 + 激活 buildFace/g1 + scale 动画弹出 |
| `hide()` | KR001Builder.ts | scale 动画缩小 → 隐藏 buildFace/g1 |
| `onBuildClicked(type)` | KR001Builder.ts | 通知 buildPoint.onBuildSelected(type) → hideImmediately() |
| `onBuildSelected(type)` | KR001BuildPoint.ts | 加载塔 prefab → instantiate → 添加攻击脚本 → 隐藏 land |

### Prefab 结构

```
KR001BuildPoint.prefab          KR001Builder.prefab
├── KR001BuildPoint (script)    ├── KR001Builder (script)
└── land (Sprite+UITransform)   └── buildFace (初始 inactive)
    触摸区域                         ├── bg (圆环 build_ring.png)
                                    └── g1
                                        ├── arrow (箭塔图标+Button)
                                        ├── barrack (兵营图标+Button)
                                        ├── magiclan (法师塔图标+Button)
                                        └── artillery (炮塔图标+Button)
```

### 设计说明

- 单例 Builder：整个场景只有一个 KR001Builder 实例，在所有 BuildPoint 之间共享复用
- 动态加载：所有 prefab 通过 resources.load() 动态加载，路径统一在 CommonConstant
- 坐标一致性：塔实例化后放在 BuildRoot 下，与 BuildPoint 同级同坐标系
- 无金钱检查：当前版本无条件允许建造
- 状态锁定：BuildPoint._isBuilt = true 后不再响应点击
