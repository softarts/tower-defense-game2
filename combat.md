# 战斗系统设计文档 (combat.md)

## 参考项目碰撞/伤害架构

参考: `kingdomRush-gxh1996/assets/scripts/levelScene/`

### 碰撞检测

参考项目使用 Cocos 2.x 的 CollisionManager:
```typescript
// levelScene.ts start()
let manager = cc.director.getCollisionManager();
manager.enabled = true;
```

- 箭矢 groupIndex=1 (Arrow group)
- 怪物 groupIndex=2 (Enemy group)
- 编辑器中配置碰撞矩阵: group 1 ↔ group 2 可碰撞

当前项目使用 **距离检测** 替代物理碰撞（更轻量）:
- ArrowBullet 在 update() 中每帧检测与所有敌人的距离
- 距离 ≤ HIT_RADIUS (15px) 时判定命中

### 伤害系统

参考项目:
```
arrowBullet.onCollisionEnter(other)
  → if (other.node.group === "Enemy")
      → monster.injure(this.attack)
      → this.destroySelf()
```

当前项目:
```
ArrowBullet.checkHit()
  → Vec3.distance(arrowWorldPos, enemyWorldPos) <= HIT_RADIUS
      → enemy.getComponent(KR001EnemyController).injure(damage)
      → this.node.destroy()
```

---

## 文件结构

### 箭塔攻击 (arrowtower/)

```
arrowtower/
├── KR001ArrowTower.ts    塔管理器：加载 prefab，初始化两个 arrower
├── KR001Arrower.ts       弓箭手：独立 update → 检测 → 射击 → 冷却
└── ArrowBullet.ts        箭矢：贝塞尔飞行 + 旋转 + 命中检测 + 伤害
```

### 法师塔 / 炮塔

```
KR001MagiclanTower.ts    自身 update → 检测 → 射击法球
KR001ArtilleryTower.ts   自身 update → 检测 → 射击炮弹
MagiclanBullet.ts        法球/炮弹弧线飞行 → 到达销毁
```

### 敌人

```
KR001EnemyController.ts  移动 + HP + 血条 + injure() + 死亡
```

---

## 攻击流程（箭塔完整链路）

```
KR001ArrowTower.onLoad()
    → resources.load(ArrowBullet prefab)
    → initArrowers(): leftPerson/rightPerson 各 addComponent(KR001Arrower)

KR001Arrower.update(dt)
    → if (_shooting) return
    → 遍历 EnemyRoot.children
    → Vec3.distance(towerWorldPos, enemyWorldPos) <= shootRange
    → shoot(enemyWorldPos)

KR001Arrower.shoot(targetWorldPos)
    → _shooting = true
    → instantiate(ArrowBullet prefab)
    → addComponent(ArrowBullet)
    → bullet.launch(startWorldPos, targetWorldPos, speed, attack=4)
    → scheduleOnce(() => _shooting = false, cooldown)

ArrowBullet.update(dt)
    → 贝塞尔曲线插值移动
    → checkHit(): 遍历敌人，距离 ≤ 15px → onHitEnemy()

ArrowBullet.onHitEnemy(enemyNode)
    → enemy.getComponent(KR001EnemyController).injure(attack)
    → this.node.destroy()
```

---

## 伤害/血条/死亡流程

```
KR001EnemyController.injure(damage)
    → _currentHP -= damage
    → if HP < 0 → HP = 0
    → bloodBar.active = true (首次受击显示)
    → refreshBloodBar(): bloodBar.progress = HP / maxHP
    → if HP <= 0 → die()

KR001EnemyController.die()
    → _isAlive = false, _isMoving = false
    → onDeath callback (通知 spawner)
    → UIOpacity fadeOut 0.5s → destroy
```

对比参考项目:
```
creature.injure(v)
    → cHP -= v; if cHP < 0 → cHP = 0

monster.refreshState() (每帧调用)
    → refreshBloodBar(): bloodBar.progress = cHP / maxHp
    → if cHP === 0 → die(monstersOfAlive, this) → playDie → releaseSelf
```

---

## 血条 (ProgressBar)

### 参考项目结构
```
monster (root)
├── bg (怪物图片)
└── bloodBar (ProgressBar, 20x2, Sliced sprite)
    └── bar (fill sprite, anchor 0,0.5)
```

### 当前项目结构
```
KR001Enemy (root)
├── Visual (怪物图片)
└── bloodBar (ProgressBar + Sprite, 20x4, green, pos 0,20)
```

- 初始隐藏 (active=false)
- 首次受击时显示
- progress = currentHP / maxHP
- totalLength = 20

---

## 攻击参数

| 参数 | 箭塔 | 法师塔 | 炮塔 |
|------|------|--------|------|
| shootRange | 150 | 170 | 200 |
| bulletSpeed | 120 | 150 | 120 |
| cooldown | 1.5s | 1.8s | 3.0s |
| attack | 4 | 8 | 6 |

### 敌人属性 (monster0)
- HP: 30
- speedOfMove: 25

### 计算
- 箭塔每 1.5s × 2 箭 = 每秒 8 伤害
- monster0 (HP=30) 需约 3.75s 击杀

---

## ArrowBullet 飞行详解

```
launch(startWorld, endWorld, speed, attack)
    → 世界坐标 → 父本地坐标
    → controlPoint = (midX, endY + 60)
    → duration = distance / speed

update(dt):
    → t = elapsed / duration
    → B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2  (二次贝塞尔)
    → node.setPosition(本地坐标)
    → checkHit(): 距离检测

doUpdateDir() (每 0.07s):
    → 方向向量 → getDegree → rotation = -(180 + degree)
    → Cocos 3.x: eulerAngles.z = -rotation2x

命中判定:
    → 每帧遍历 EnemyRoot.children
    → Vec3.distance(arrowWorldPos, enemyWorldPos) <= 15px
    → 命中: injure + destroy
    → 未命中到达终点: fadeOut + destroy
```

---

## 启用碰撞/物理

```typescript
// KR001SceneSetup.ts start()
PhysicsSystem2D.instance.enable = true;
```

注意: 当前实际使用距离检测而非物理碰撞，PhysicsSystem2D 启用是为后续扩展准备。


---

## 附录：Cocos Creator 3.x 2D 碰撞系统简介

### 使用方式

Cocos 3.x 的 2D 碰撞检测基于 Box2D 物理引擎：

```typescript
// 1. 启用物理系统
PhysicsSystem2D.instance.enable = true;

// 2. 两个参与碰撞的节点都需要添加：
//    - RigidBody2D (type: Static/Dynamic/Kinematic)
//    - Collider2D (BoxCollider2D / CircleCollider2D / PolygonCollider2D)

// 3. 在 Project Settings → Physics → Collision Matrix 中配置碰撞分组
//    例如: "Bullet" 组 与 "Enemy" 组 勾选可碰撞

// 4. 在脚本中注册碰撞回调
import { Contact2DType, Collider2D, IPhysics2DContact } from 'cc';

onLoad() {
    const collider = this.getComponent(Collider2D);
    if (collider) {
        collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }
}

onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
    // 碰撞发生
    const enemyNode = otherCollider.node;
    // ...处理伤害
}
```

### 需要的组件和配置

| 节点 | 需要的组件 | 设置 |
|------|-----------|------|
| 箭矢 | RigidBody2D (type=Kinematic) + BoxCollider2D (sensor=true) | group="Bullet" |
| 敌人 | RigidBody2D (type=Kinematic) + BoxCollider2D (sensor=true) | group="Enemy" |

- `type=Kinematic`: 不受物理力影响，位置由代码控制（不会因重力掉落）
- `sensor=true`: 只检测碰撞，不产生物理推力
- 两个节点必须设置在不同的碰撞分组，且在 Collision Matrix 中勾选互相碰撞

### 为什么当前项目不使用它

| 问题 | 说明 |
|------|------|
| RigidBody2D 副作用 | 即使 type=Kinematic，物理系统仍然每帧模拟节点，当用 setPosition 移动节点时可能和物理状态冲突 |
| 碰撞矩阵需要编辑器配置 | 需要在 Project Settings 手动添加分组并勾选，无法通过 MCP 或代码设置 |
| prefab 需要额外组件 | 需要给每个子弹和每个敌人的 prefab 添加 RigidBody2D + Collider2D，增加复杂度 |
| 贝塞尔手动插值冲突 | ArrowBullet 用 setPosition 做贝塞尔移动，Kinematic RigidBody 的 position 同步可能不及时 |
| 调试困难 | 物理碰撞是异步的（在物理步进后触发），和渲染帧不完全同步 |
| 当前需求简单 | 只有几个敌人，距离检测 O(n) 每帧毫无性能压力 |

### 距离检测 vs 物理碰撞对比

| 维度 | 距离检测 (当前方案) | 物理碰撞 (Cocos 3.x) |
|------|-------------------|---------------------|
| 依赖 | 无，纯数学 | PhysicsSystem2D + Box2D |
| 配置 | 零配置 | 碰撞分组矩阵 + 多个组件 |
| 精度 | 圆形范围 (HIT_RADIUS) | 精确形状匹配 (Box/Circle) |
| 性能 | O(子弹数 × 敌人数) 每帧 | O(1) 由物理引擎空间索引优化 |
| 适用场景 | 敌人少 (<50) | 大量物体需要碰撞 |
| 调试 | log 即可 | 需要开 debugDraw |

**结论：** 当前阶段用距离检测完全满足需求，且避免了物理引擎带来的配置复杂度和潜在的位置同步问题。未来如果敌人数量大幅增加（>100），可以切换到物理碰撞方案。
