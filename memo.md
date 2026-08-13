# 点击空地 → 显示圆形建筑菜单 调用过程

## 整体流程

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

## 涉及文件与职责

| 文件 | 职责 |
|------|------|
| `assets/scripts/kr001/KR001SceneSetup.ts` | 场景初始化时加载两个 prefab，创建共享 Builder 实例，遍历 `posOfBuilders` 创建 BuildPoint 并通过 `setBuilder()` 把 Builder 引用注入每个 BuildPoint |
| `assets/scripts/kr001/KR001BuildPoint.ts` | 代表单个可建造位置。`onLoad` 时监听 land 子节点的 `TOUCH_END` 事件，点击后调用 `this._builder.show(this)` |
| `assets/scripts/kr001/KR001Builder.ts` | 管理圆形建筑菜单（单例）。`show(buildPoint)` 将自身移动到目标位置并播放弹出动画；再次点击同一空地则 `hide()` |

## 关键函数

| 函数 | 文件 | 作用 |
|------|------|------|
| `createBuildPoints()` | KR001SceneSetup.ts | 加载 prefab → 实例化 Builder（1个） → 实例化 BuildPoint（N个） → `setBuilder()` 建立关联 |
| `onLandClicked(event)` | KR001BuildPoint.ts | land 节点的 TOUCH_END 回调，触发 `builder.show(this)` |
| `setBuilder(builder)` | KR001BuildPoint.ts | 接收共享 Builder 引用 |
| `show(buildPoint)` | KR001Builder.ts | 移动位置 + 激活 buildFace/g1 + scale 动画弹出 |
| `hide()` | KR001Builder.ts | scale 动画缩小 → 隐藏 buildFace/g1 |

## Prefab 结构

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

## 设计说明

参考项目中每个 builder prefab 都自带完整菜单，但当前项目改为共享一个 Builder 实例在所有 BuildPoint 之间复用——点击哪个空地就移动过去显示。这样更省内存，也保证同时只有一个菜单。
