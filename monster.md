# 怪物系统设计文档

## Monster0 配置 (gameConfig.json)

```json
{
    "no": 0,
    "HP": 30,
    "speedOfMove": 25,
    "intervalOfAttack": 1,
    "aggressivity": 10,
    "rangeOfAttack": 15,
    "rangeOfInvestigate": 50,
    "intervalOfThink": 1,
    "price": 10
}
```

---

## 血条实现对比

### 参考项目 (Cocos 2.x)

使用 `cc.ProgressBar` 组件：

```
monster (root)
├── bg (怪物 Sprite)
└── bloodBar (cc.ProgressBar, 20×2)
    └── bar (Sprite, anchor 0,0.5, Sliced 类型, 用作 barSprite)
```

代码：
```typescript
// creature.ts
@property({ type: cc.ProgressBar })
protected bloodBar: cc.ProgressBar = null;

protected refreshBloodBar() {
    this.bloodBar.progress = this.cHP / this.maxHp;  // [0, 1]
}
```

cc.ProgressBar 内部根据 `progress` 值自动缩放 `barSprite` 的宽度。需要在 Inspector 中手动将 bar 节点的 Sprite 拖到 ProgressBar 的 `barSprite` 属性上。

### 当前项目 (Cocos 3.x)

**不使用 ProgressBar 组件**，直接通过 `UITransform.width` 缩放实现：

```
KR001Enemy (root)
├── Visual (怪物 Sprite)
└── bloodBar (Sprite, 红色, 20×4, anchor 0,0.5, pos -10,20)
```

代码：
```typescript
// KR001EnemyController.ts
private _bloodBarNode: Node | null = null;
private _bloodBarTransform: UITransform | null = null;
private _bloodBarFullWidth: number = 20;

private refreshBloodBar(): void {
    if (this._bloodBarTransform) {
        const ratio = this._currentHP / this._maxHP;
        this._bloodBarTransform.width = this._bloodBarFullWidth * ratio;
    }
}
```

### 为什么不用 ProgressBar？

1. ProgressBar 需要在 Inspector 中手动拖拽 `barSprite` 引用，通过 MCP 创建的 prefab 无法自动设置组件间引用
2. 直接修改 UITransform.width 功能完全等价，且不依赖任何额外组件引用
3. 代码更简单直观

### UITransform 是什么？

`UITransform` 是 Cocos 3.x 中所有 2D/UI 节点必须具有的组件，它定义节点的：
- `contentSize` (width × height) — 节点的渲染/触摸区域大小
- `anchorPoint` (x, y) — 节点的锚点

血条原理：
1. bloodBar 是一个 Sprite 节点，初始宽度 20px
2. anchor = (0, 0.5)，即锚点在左边缘中心
3. 减少 width 时，右边缘向左收缩，左边缘不动
4. 视觉效果 = 血条从右往左缩短

---

## 碰撞/命中检测对比

### 参考项目 — Cocos 2.x 碰撞系统

使用引擎内置的 **CollisionManager**：

```typescript
// levelScene.ts — 启用碰撞
let manager = cc.director.getCollisionManager();
manager.enabled = true;

// arrow.prefab — 箭矢有 cc.BoxCollider (groupIndex=1)
// monster.prefab — 怪物有 cc.BoxCollider (groupIndex=2)
// 编辑器中配置碰撞矩阵: group 1 ↔ group 2 可碰撞

// arrowBullet.ts — 碰撞回调
onCollisionEnter(other: cc.Collider, self: cc.Collider) {
    if (other.node.group === "Enemy") {
        let m = other.node.getComponent("monster");
        m.injure(this.attack);
        this.destroySelf();
    }
}
```

关键点：
- 需要在两个 prefab 上都添加 Collider 组件
- 需要在编辑器 Project Settings → Physics → Collision Matrix 中配置哪些 group 互相碰撞
- 引擎自动检测重叠并触发 `onCollisionEnter` 回调

### 当前项目 — 手动距离检测

**没有使用任何 Cocos 碰撞 API**。使用纯数学距离判断：

```typescript
// ArrowBullet.ts — 每帧检测
private checkHit(): void {
    const arrowWorldPos = this.node.getWorldPosition();
    const enemies = this._enemyRoot.children;

    for (const enemy of enemies) {
        const enemyPos = enemy.getWorldPosition();
        const dist = Vec3.distance(arrowWorldPos, enemyPos);
        if (dist <= this.HIT_RADIUS) {  // HIT_RADIUS = 30
            this.onHitEnemy(enemy);
            return;
        }
    }
}
```

### 为什么不用 Cocos 3.x 碰撞系统？

Cocos 3.x 的 2D 碰撞需要：
1. 两个节点都添加 `RigidBody2D` 组件
2. 两个节点都添加 `BoxCollider2D` 组件
3. 在 Project Settings 中配置 Physics Group
4. 在代码中注册 `Contact2DType.BEGIN_CONTACT` 回调
5. PhysicsSystem2D 会添加物理模拟（重力等），需要额外配置 type=Kinematic 避免掉落

距离检测优势：
- 无需物理引擎开销
- 不需要配置碰撞分组矩阵
- 不需要 RigidBody2D（避免物理模拟副作用）
- prefab 不需要添加额外组件
- 逻辑完全自控，调试简单

劣势：
- 每帧遍历所有敌人（O(n)），敌人多时性能稍差
- HIT_RADIUS 是圆形检测，不如 BoxCollider 精确匹配形状

当前阶段敌人数量少（10个以内），距离检测完全够用。

---

## 死亡流程

```
KR001EnemyController.injure(damage=4)
    → _currentHP -= 4  (30 → 26 → 22 → ... → 2 → 0)
    → bloodBar.active = true (首次)
    → refreshBloodBar(): width = 20 * (HP/maxHP)
    → if HP <= 0 → die()

die():
    → _isAlive = false
    → _isMoving = false
    → onDeath callback → spawner 计数 -1
    → UIOpacity fadeOut 0.5s → node.destroy()
```

---

## 数据加载

```
KR001SceneSetup.start()
    → await GameDataStorage.load()     // 加载 gameConfig.json
    → await LevelDataManager.loadLevel(1)

KR001EnemySpawner.start()
    → GameDataStorage.getGameConfig().getMonsterData()[0].speedOfMove = 25
    → controller.init(path, 25)

KR001EnemyController.init()
    → GameDataStorage.getGameConfig().getMonsterData()[0].HP = 30
    → _maxHP = _currentHP = 30
```
