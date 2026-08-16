# 建筑攻击系统设计文档

## 参考项目架构

参考: `kingdomRush-gxh1996/assets/scripts/levelScene/tower/`

### 箭塔 (Arrow Tower) — 三文件结构

```
arrowTower.ts    塔管理器（等级、对象池、图集切换、初始化两个弓箭手）
    │
    ├── arrower.ts     左弓箭手（独立 update → 检测 → 射击 → 冷却）
    │
    ├── arrower.ts     右弓箭手（独立 update → 检测 → 射击 → 冷却）
    │
    └── arrowBullet.ts 箭矢（贝塞尔飞行 + 方向旋转 + 到达后淡出）
```

关键设计：
- arrowTower **不射击**，只做管理
- 两个 arrower 各自拥有独立的 `update()` + `shooting` 冷却标志
- 两人交替射击（不是同时双发），因为各自冷却独立
- 子弹从弓箭手的世界坐标发出（不是塔中心）

### 法师塔 / 炮塔 — 单文件结构

```
magiclanTower.ts   自身 update → 检测 → 射击 → 创建 magiclanBullet → 冷却
artilleryTower.ts  自身 update → 检测 → 射击 → 创建 artilleryBullet → 冷却
```

---

## 当前项目实现

### 文件对应关系

| 当前项目 | 对应参考项目 | 职责 |
|---------|------------|------|
| `arrowtower/KR001ArrowTower.ts` | `arrowTower.ts` | 加载子弹 prefab，初始化两个 KR001Arrower |
| `arrowtower/KR001Arrower.ts` | `arrower.ts` | 独立 update → 检测敌人 → 射击 → 冷却 |
| `arrowtower/ArrowBullet.ts` | `arrowBullet.ts` | 贝塞尔曲线飞行 + 方向旋转 + 到达淡出销毁 |
| `MagiclanBullet.ts` | `magiclanBullet.ts` | 弧线飞行（无旋转，法球是圆的）→ 到达销毁 |
| `KR001MagiclanTower.ts` | `magiclanTower.ts` | 自身 update → 检测 → 射击法球 |
| `KR001ArtilleryTower.ts` | `artilleryTower.ts` | 自身 update → 检测 → 射击炮弹 |

### 子弹 Prefab

| Prefab | 图片 | 尺寸 | 用途 |
|--------|------|------|------|
| `ArrowBullet.prefab` | `arrow.png` | 20×6 px | 细长箭矢 |
| `MagiclanBullet.prefab` | `magiclan_bullet.png` | 20×20 px | 圆形法球 |
| `ArtilleryBullet.prefab` | `pao1_bullet.png` | 18×18 px | 圆形炮弹 |

---

## 攻击流程

### 箭塔攻击流程

```
KR001ArrowTower.onLoad()
    → resources.load(PREFAB_ARROW_BULLET)
    → initArrowers()
        → leftPerson.addComponent(KR001Arrower).init(tower, range, speed, cooldown)
        → rightPerson.addComponent(KR001Arrower).init(...)
        (两人同步射击，不错开冷却)

KR001Arrower.update(dt)              ← 引擎每帧自动调用
    → if (_shooting) return          // 冷却中跳过
    → 遍历 EnemyRoot.children
    → Vec3.distance(towerWorldPos, enemyWorldPos)  // 用塔的位置做距离判断
    → if (dist <= shootRange)
        → shoot(enemyWorldPos, prefab)

KR001Arrower.shoot(targetWorldPos, prefab)
    → _shooting = true
    → startPos = this.node.getWorldPosition()   // 弓箭手世界位置
    → instantiate(prefab) → addChild to BuildRoot
    → bulletNode.addComponent(ArrowBullet)
    → bullet.launch(startWorldPos, targetWorldPos, speed)
    → scheduleOnce(() => _shooting = false, cooldown)
```

### ArrowBullet 飞行逻辑 (严格移植 arrowBullet.ts)

```
launch(startWorld, endWorld, speed)
    → 世界坐标 → 父节点本地坐标 (convertToNodeSpaceAR)
    → localStart, localEnd (和参考项目一致用本地坐标系飞行)
    → controlPoint = (midX, endY + 60)  // 参考: let c = cc.v2(middle.x, nodeEnd.y + 60)
    → if (startX ≈ endX) controlX += 30
    → duration = distance / speed

    update(dt):
        → elapsed += dt
        → t = elapsed / duration
        → 二次贝塞尔: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        → node.setPosition(x, y)  // 本地坐标
        → if t >= 1: onArrived()

    doUpdateDir() (每 0.07s 调用一次):
        → curPos - lastPos → 方向向量 (dx, dy)
        → getDegree(dx, dy) → 角度 [0, 360)
        → rotation = -(OFFSET_DEGREE + degree)  // OFFSET_DEGREE=180, 箭图片朝左
        → Cocos 3.x: eulerAngles.z = -rotation2x

    getDegree(dx, dy):   // 完全移植参考项目的象限处理
        → atan(dy/dx) * 180/PI
        → 处理四个象限 + 轴上特殊情况
        → 返回 [0, 360)

    onArrived():
        → UIOpacity fadeOut 0.5s → destroy
```

### 法师塔 / 炮塔攻击流程

```
KR001MagiclanTower.update(dt) / KR001ArtilleryTower.update(dt)
    → if (!_canShoot) return
    → 遍历 EnemyRoot.children
    → 距离检测
    → shoot(target)
        → _canShoot = false
        → instantiate(bulletPrefab)
        → addComponent(KR001Bullet).launch(...)
        → scheduleOnce(() => _canShoot = true, cooldown)
```

---

## 子弹飞行逻辑

### ArrowBullet (arrowtower/ArrowBullet.ts)

严格移植 arrowBullet.ts，使用**本地坐标** + **手动二次贝塞尔插值**：
- 不使用 tween worldPosition（会导致方向错误）
- 在 update(dt) 中每帧计算 B(t) 并 setPosition
- 每 0.07s 通过 scheduleOnce 更新箭头旋转方向

### MagiclanBullet (MagiclanBullet.ts)

法球/炮弹使用 tween worldPosition 弧线飞行（无旋转需求，球形子弹不需要朝向）。

---

## 敌人检测机制

```
// 参考项目：Monster.monstersOfAlive 静态数组
// 当前项目：通过 find("Canvas/EnemyRoot").children 获取活跃敌人

距离计算: Vec3.distance(towerWorldPos, enemyWorldPos)
射程判断: dist <= shootRange
目标选择: 遍历到第一个在射程内的敌人就射击（break）
```

---

## 冷却机制

```
// 参考项目：
private coolingShoot() {
    this.scheduleOnce(() => { this.shooting = false; }, this.speedOfShoot);
}

// 当前项目：相同模式
this.scheduleOnce(() => { this._shooting = false; }, this._cooldown);
```

---

## 攻击参数 (CommonConstant)

| 参数 | 箭塔 | 法师塔 | 炮塔 |
|------|------|--------|------|
| shootRange | 150 | 170 | 200 |
| bulletSpeed | 120 | 150 | 120 |
| cooldown | 1.5s | 1.8s | 3.0s |

参考项目 gameConfig.json 中箭塔 Level 1 数据:
- speedOfArrow: 180, shootRange: 150, speedOfShoot(cooldown): 2s

---

## 组件挂载时机

建造完成后由 `KR001BuildPoint.attachTowerScript()` 根据 buildType 动态添加：

```typescript
switch (buildType) {
    case 'arrow':     towerNode.addComponent(KR001ArrowTower);     break;
    case 'magiclan':  towerNode.addComponent(KR001MagiclanTower);  break;
    case 'artillery': towerNode.addComponent(KR001ArtilleryTower); break;
    // barrack 不射击
}
```

Tower 脚本的 `onLoad()` 被引擎自动调用 → 加载 bullet prefab → 初始化子系统 → `update()` 开始每帧检测。

---

## update() 驱动机制

Cocos Creator 引擎主循环每帧自动调用所有 active 节点上 enabled 组件的 `update(dt)`：

```
引擎 requestAnimationFrame (~60fps)
  → Director.mainLoop()
    → 遍历场景所有 active Node
      → 对每个 enabled Component 调用 update(dt)
```

塔节点实例化后被 addChild 到 BuildRoot（active=true），其上的 Tower 脚本 update() 立即开始被引擎驱动。

---

## 与建造系统的关系

```
KR001BuildPoint.onBuildSelected(type)
    → instantiate(towerPrefab)          // 创建塔节点（含 bg/leftPerson/rightPerson 等视觉）
    → parent.addChild(towerNode)
    → attachTowerScript(towerNode, type) // 动态添加攻击脚本
    → Tower 脚本 onLoad() 自动触发
    → 初始化完成后 update() 开始自动射击
```
