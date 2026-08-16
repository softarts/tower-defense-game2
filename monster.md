# 怪物系统设计文档

## 参考项目架构

参考: `kingdomRush-gxh1996/assets/scripts/levelScene/monster/`

### 文件结构

```
gameDataManager.ts    加载 gameConfig.json，提供 getMonsterData()
creature.ts           生物基类（怪物和士兵共用）：HP、speedOfMove、move()方法
monster.ts            怪物控制器：init → 读取配置 → 沿路径移动 → 战斗逻辑
monsterFactory.ts     怪物工厂：实例化、管理存活列表
```

---

## Monster0 配置 (默认基础怪物)

参考项目 `gameConfig.json` 中的 `mosterData[0]`：

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

### 属性说明

| 属性 | 值 | 含义 |
|------|------|------|
| no | 0 | 怪物编号（作为数组索引） |
| HP | 30 | 生命值 |
| speedOfMove | 25 | 移动速度（像素/秒） |
| intervalOfAttack | 1 | 攻击间隔（秒） |
| aggressivity | 10 | 攻击力 |
| rangeOfAttack | 15 | 攻击范围（像素） |
| rangeOfInvestigate | 50 | 侦察/索敌范围（像素） |
| intervalOfThink | 1 | AI 思考间隔（秒） |
| price | 10 | 击杀奖励金币 |

---

## 当前项目 gameConfig.json 位置

```
assets/resources/gameConfig.json
```

加载路径：`resources.load('gameConfig', JsonAsset, ...)`

---

## 速度对比

| 项目 | 属性名 | 默认值 | 备注 |
|------|--------|--------|------|
| 参考项目 | `speedOfMove` | 25 | 从 gameConfig.json 按怪物编号读取 |
| 当前项目 | `moveSpeed` | 80 | KR001EnemyController.ts 硬编码 |

**当前项目的 80 太快了**（参考只有 25）。应改为从 `gameConfig.json` 读取。

---

## 参考项目中速度的使用方式

### creature.ts 基类 — move() 方法

```typescript
protected move(des: cc.Vec2, func: Function = null, t: number = null) {
    let dnp = this.node.parent.convertToNodeSpaceAR(des);
    let cnp = this.node.getPosition();
    let dis = dnp.sub(cnp);
    if (t === null) {
        let l = dis.mag();
        t = l / this.speedOfMove;  // 移动时间 = 距离 / 速度
    }
    this._move.moveTo(dis, t, func);
}
```

速度不直接用于每帧 step，而是用来计算整段路的**移动时间**（duration-based 而非 step-based）。

### monster.ts — 初始化

```typescript
init(monsterNo: number, path: cc.Vec2[]) {
    let md = this.monsterData[monsterNo];
    this.speedOfMove = md.speedOfMove;
    // ...
    this.initPathTime(); // 预计算每段路时间
}

private initPathTime() {
    for (let i = 0; i < this.path.length - 1; i++) {
        let l = this.path[i + 1].sub(this.path[i]).mag();
        this.pathTime[i] = l / this.speedOfMove;
    }
}
```

---

## 当前项目 KR001EnemyController.ts 的实现

当前使用 step-based 方式（每帧移动固定距离）：

```typescript
// update(dt):
const step = this.moveSpeed * dt;
// if step >= distance: snap to waypoint
// else: move ratio toward target
```

这和参考项目的 duration-based (`moveTo(dis, time)`) 方式不同但功能等价。关键是把 `moveSpeed` 从硬编码的 80 改为从 gameConfig.json 读取的 25。

---

## 接入 gameConfig.json 的改动计划

1. `KR001SceneSetup.ts` 或新建 `GameConfigManager.ts` 在场景启动时加载 `gameConfig.json`
2. `KR001EnemySpawner.ts` 创建敌人时读取 `monsterData[monsterNo].speedOfMove`
3. `KR001EnemyController.init(path, speed)` 中传入配置的速度

暂时最简改法：`KR001EnemyController.moveSpeed` 默认值从 80 改为 25（与参考项目一致）。

---

## 参考项目全部怪物类型

| no | HP | speedOfMove | aggressivity | price |
|----|-----|-------------|-------------|-------|
| 0  | 30  | 25          | 10          | 10    |
| 1  | 40  | 20          | 8           | 12    |
| 2  | 20  | 30          | 6           | 8     |
| 3  | 50  | 25          | 12          | 15    |
| 4  | 80  | 20          | 15          | 20    |

当前项目只需 monster0 (no=0, HP=30, speed=25)。
