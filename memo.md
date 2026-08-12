```markdown
# KR001 场景、Prefab、脚本与资源关系分析

> 本文整理截至目前我们对 `tower-defense-game2` / Cocos Creator 3.8.8 项目的讨论与验证结果。
>
> 重点是区分：
> - 已经从文件内容直接证明的事实
> - 根据 Cocos 序列化格式得到的确定性结论
> - 尚未验证、不能当作事实的推测

---

## 1. 项目背景

项目：

```text
H:\work\mygithub\tower-defense-game2
```

使用：

```text
Cocos Creator 3.8.8
```

当前主要关注：

```text
assets/
├─ resources/
│  ├─ textures/
│  │  └─ monster/
│  │     └─ m0/
│  │        └─ walk/
│  │           ├─ actor0_0.png
│  │           ├─ actor0_1.png
│  │           ├─ ...
│  │           └─ actor0_9.png
│  │
│  └─ prefabs/
│     └─ enemy/
│        └─ KR001Enemy.prefab
│
├─ scenes/
│  └─ KR001.scene
│
└─ scripts/
   └─ kr001/
      ├─ EnemyAnimator.ts
      ├─ EnemyFactory.ts
      ├─ KR001EnemyController.ts
      ├─ KR001EnemySpawner.ts
      ├─ KR001MapLoader.ts
      ├─ KR001SceneSetup.ts
      └─ PathLoader.ts
```

---

# 2. Texture2D 与 SpriteFrame 的关系

Cocos 中：

```text
PNG
 │
 ▼
Texture2D
 │
 ├── SpriteFrame
 ├── SpriteFrame
 ├── SpriteFrame
 └── ...
```

二者不是同一种资源。

## Texture2D

Texture2D 表示实际的纹理/图片数据。

例如：

```text
actor0_0.png
```

导入后对应一个 Texture2D。

---

## SpriteFrame

SpriteFrame 是对 Texture2D 的一个显示区域描述。

它可以包含：

```text
rawTextureUuid
trimX
trimY
width
height
offsetX
offsetY
rawWidth
rawHeight
rotated
...
```

也就是说：

```text
Texture2D = 图片本体

SpriteFrame = “从这张图片的哪个区域，以什么方式显示”
```

即使 PNG 是一整张图片，也可以有一个 SpriteFrame 指向它。

如果是一张 Sprite Sheet，则一张 Texture2D 可以对应很多 SpriteFrame。

---

# 3. actor0_0.png.meta 的证据

我们看到：

```json
{
  "ver": "1.0.22",
  "importer": "texture",
  "imported": true,
  "uuid": "0bad0111-c3ee-42c6-a5a0-053892e54c1e",
  "files": [
    ".json"
  ],
  "subMetas": {
    "actor0_0": {
      "ver": "1.0.6",
      "uuid": "19cc5a43-81f0-49e5-a900-5a3838c803ac",
      "importer": "sprite-frame",
      "rawTextureUuid": "0bad0111-c3ee-42c6-a5a0-053892e54c1e",
      ...
    }
  }
}
```

因此这里存在两个 UUID：

```text
Texture2D UUID
0bad0111-c3ee-42c6-a5a0-053892e54c1e

SpriteFrame UUID
19cc5a43-81f0-49e5-a900-5a3838c803ac
```

其中：

```text
SpriteFrame.rawTextureUuid
        │
        ▼
Texture2D.uuid
```

两者直接对应。

---

# 4. 之前出现紫色方块 / 山形占位符的原因

之前直接复制 prefab、meta 和 PNG 时，出现：

```text
Missing class
```

以及：

```text
No walk sprite frames found
```

后来又出现：

```text
actor0_0.png 显示一个山形占位符
```

最终验证发现：

```text
PNG 本身是有效的
```

问题与资源导入/meta 状态有关。

当 PNG 删除后重新导入：

```text
actor0_0.png
```

Cocos 重新生成对应 meta / 导入缓存后：

```text
图片可以正常显示
```

因此最终得到一个重要经验：

> 当资源文件有效，但 Cocos 中显示为占位符、山形图标或者 SpriteFrame 无法正常使用时，不能只判断 PNG 本身是否损坏，还必须检查对应的 `.meta`、UUID 和 Cocos 导入缓存是否一致。

---

# 5. actor0_8 / actor0_9 的 meta 问题

当时出现：

```text
[Assets] H:\work\mygithub\tower-defense-game2\assets\resources\textures\monster\m0\walk\actor0_8.png.meta is not exist! will use cache meta.

[Assets] H:\work\mygithub\tower-defense-game2\assets\resources\textures\monster\m0\walk\actor0_9.png.meta is not exist! will use cache meta.
```

这说明：

```text
PNG 文件存在
```

但是：

```text
对应 .meta 文件不存在
```

Cocos 因此使用已有的缓存 meta。

这进一步说明：

> Cocos 资源引用并不只是“文件路径”，UUID / meta / 导入缓存都参与了资源识别。

---

# 6. 为什么 prefab 不是简单的一张图片

KR001Enemy prefab 最终能够显示敌人之后，我们讨论了：

> 为什么一个敌人 prefab 需要很多 Frame？

原因是敌人的行走动画。

例如：

```text
actor0_0
actor0_1
actor0_2
...
actor0_9
```

可以组成：

```text
walk animation
```

逻辑关系：

```text
actor0_0 ─┐
actor0_1 ─┤
actor0_2 ─┤
actor0_3 ─┤
...        ├──> Walk Animation
actor0_9 ─┘
                │
                ▼
            Sprite
                │
                ▼
          Enemy Prefab
```

因此：

> prefab 本身不一定“需要”10张图片才能存在。

真正需要多 Frame 的是：

```text
动画
```

Prefab 可以只有一个 SpriteFrame。

如果只需要静态显示敌人：

```text
Prefab
 └─ Sprite
     └─ actor0_0
```

就够了。

如果需要行走动画：

```text
Prefab
 └─ Sprite
      │
      └─ Animation
           ├─ actor0_0
           ├─ actor0_1
           ├─ ...
           └─ actor0_9
```

才需要多个 Frame。

---

# 7. 当前 KR001 脚本目录

目录：

```text
H:\work\mygithub\tower-defense-game2\assets\scripts\kr001
```

内容：

```text
EnemyAnimator.ts
EnemyAnimator.ts.meta

EnemyFactory.ts
EnemyFactory.ts.meta

KR001EnemyController.ts
KR001EnemyController.ts.meta

KR001EnemySpawner.ts
KR001EnemySpawner.ts.meta

KR001MapLoader.ts
KR001MapLoader.ts.meta

KR001SceneSetup.ts
KR001SceneSetup.ts.meta

PathLoader.ts
PathLoader.ts.meta
```

这些脚本的职责可以从名称和目前看到的调用日志中建立如下关系。

---

# 8. KR001 场景整体结构

当前 `KR001.scene` 中：

```text
Scene
└─ Canvas
   ├─ Main Camera
   ├─ MapRoot
   │  └─ LevelMap
   │     ├─ UITransform
   │     ├─ Sprite
   │     └─ KR001MapLoader
   │
   ├─ EnemyRoot
   │  ├─ UITransform
   │  └─ KR001EnemySpawner
   │
   ├─ DebugRoot
   │
   ├─ KR001Enemy
   │
   └─ testSprite
      ├─ UITransform
      └─ Sprite
```

这是从 `KR001.scene` 的 `_children` 和 `_components` 数组直接得到的。

---

# 9. Cocos 场景序列化中的 __id__ 是什么

这是目前讨论中最容易混淆的地方。

例如：

```json
{
  "__type__": "cc.Node",
  "_name": "LevelMap",
  "_parent": {
    "__id__": 6
  },
  "_components": [
    {
      "__id__": 8
    },
    {
      "__id__": 9
    },
    {
      "__id__": 10
    }
  ],
  "_id": "6dUz79MFNFUbVm25+SHHeh"
}
```

这里同时出现了两种不同概念的 ID：

```text
__id__
```

和：

```text
_id
```

不能混为一谈。

---

# 10. __id__ 是序列化对象数组中的索引

`KR001.scene` 最外层实际上是一个数组：

```text
[
  object 0,
  object 1,
  object 2,
  object 3,
  ...
]
```

例如：

```json
{
  "__type__": "cc.Scene",
  "_children": [
    {
      "__id__": 2
    }
  ]
}
```

这里的：

```text
"__id__": 2
```

不是 UUID。

它表示：

```text
引用 scene 文件序列化对象数组中的第 2 项
```

同理：

```json
"_components": [
  {
    "__id__": 8
  },
  {
    "__id__": 9
  },
  {
    "__id__": 10
  }
]
```

表示这个 Node 的三个组件分别引用：

```text
object[8]
object[9]
object[10]
```

---

# 11. 为什么 LevelMap 是 object[7]

`LevelMap` 本身：

```json
{
  "__type__": "cc.Node",
  "_name": "LevelMap",
  ...
  "_components": [
    {
      "__id__": 8
    },
    {
      "__id__": 9
    },
    {
      "__id__": 10
    }
  ]
}
```

根据它在整个 scene 数组中的位置，它是：

```text
object[7]
```

它的三个组件：

```text
object[8]
object[9]
object[10]
```

其中：

```text
object[8] = cc.UITransform
object[9] = cc.Sprite
object[10] = KR001MapLoader
```

所以结构是：

```text
object[7]
  │
  ├── LevelMap Node
  │
  ├── object[8] UITransform
  ├── object[9] Sprite
  └── object[10] KR001MapLoader
```

---

# 12. 为什么 LevelMap 自己没有 "__id__": 7

这是一个关键点。

LevelMap 的对象定义里面没有：

```json
"__id__": 7
```

而是：

```json
"_id": "6dUz79MFNFUbVm25+SHHeh"
```

原因是：

```text
__id__
```

和：

```text
_id
```

不是同一种 ID。

`__id__` 是：

```text
序列化文件内部引用机制
```

而 `_id` 是：

```text
Cocos 对象自身的持久化/编辑器 ID
```

因此：

```text
LevelMap 的 object index = 7
```

并不是通过：

```text
LevelMap._id
```

算出来的。

而是因为：

```text
LevelMap 这个对象本身就是 scene 序列化数组中的第 7 项。
```

---

# 13. _id 与 __id__ 的区别

可以简单记成：

```text
__id__
    ↓
“数组里面第几个对象？”

_id
    ↓
“这个 Cocos 对象自己的持久化 ID 是什么？”
```

例如：

```text
LevelMap

数组位置：
object[7]

自身 _id：
6dUz79MFNFUbVm25+SHHeh
```

二者完全可以不同。

---

# 14. id 4、5 为什么“看起来不见了”

Scene 中：

```text
object[3] = UITransform(Main Camera)
object[4] = Camera
object[5] = ...
```

当查看某一部分时，很容易因为对象之间相互引用以及内容截取而产生：

```text
“4、5 怎么不见了？”
```

实际上它们仍然是 scene 序列化数组中的对象。

关键原则：

> `__id__` 是数组引用，所以不能把它理解为 Node ID，也不能只根据 Node 名称去寻找。

需要从整个最外层数组按索引建立：

```text
object[0]
object[1]
object[2]
...
```

映射表。

---

# 15. KR001MapLoader 的关联

我们已经验证：

```text
KR001MapLoader.ts.meta
```

内容：

```json
{
  "ver": "4.0.24",
  "importer": "typescript",
  "imported": true,
  "uuid": "2ac76f8d-ac72-49dd-8fbc-72c55c5c4591",
  "files": [],
  "subMetas": {},
  "userData": {}
}
```

所以：

```text
KR001MapLoader.ts UUID

2ac76f8d-ac72-49dd-8fbc-72c55c5c4591
```

---

# 16. 为什么 scene 中是 2ac76+NrHJJ3Y+8csVcXEWR

scene 中：

```json
{
  "__type__": "2ac76+NrHJJ3Y+8csVcXEWR",
  ...
}
```

一开始不能仅凭肉眼证明二者对应。

后来验证了 Cocos 对 UUID 后半部分进行 Base64 编码的机制。

原始 UUID：

```text
2ac76f8d-ac72-49dd-8fbc-72c55c5c4591
```

拆开：

```text
2ac76
+
f8d-ac72-49dd-8fbc-72c55c5c4591
```

后半部分：

```text
f8d-ac72-49dd-8fbc-72c55c5c4591
```

经过 Base64 编码后：

```text
+NrHJJ3Y+8csVcXEWR
```

于是得到：

```text
2ac76
+
+NrHJJ3Y+8csVcXEWR
```

即：

```text
2ac76+NrHJJ3Y+8csVcXEWR
```

与 scene 中完全一致。

---

# 17. 这个关系的意义

因此：

```text
KR001MapLoader.ts.meta
        │
        │ uuid
        ▼
2ac76f8d-ac72-49dd-8fbc-72c55c5c4591
        │
        │ Cocos 序列化形式
        ▼
2ac76+NrHJJ3Y+8csVcXEWR
        │
        │ __type__
        ▼
KR001.scene 中的 KR001MapLoader 组件类型
```

这是目前已经得到实际验证的硬证据。

---

# 18. KR001MapLoader 在 scene 中的位置

对应 scene 对象：

```json
{
  "__type__": "2ac76+NrHJJ3Y+8csVcXEWR",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": {
    "__id__": 7
  },
  "_enabled": true,
  "__prefab": null,
  "mapPath": "level1/map1/spriteFrame",
  "_id": "f0N+sx0ERLfpi3dnLalcdc"
}
```

这里有两个重要信息：

```text
__type__
```

证明这是：

```text
KR001MapLoader
```

而：

```text
node: {
    "__id__": 7
}
```

证明：

```text
KR001MapLoader
        │
        ▼
scene object[7]
        │
        ▼
LevelMap
```

因此可以完整确定：

```text
object[7]
LevelMap Node
    │
    ├── object[8] UITransform
    ├── object[9] Sprite
    └── object[10] KR001MapLoader
```

---

# 19. 最重要的引用关系

KR001.scene 中：

```text
Canvas = object[2]

Canvas.children
    ├── object[3] Main Camera
    ├── object[6] MapRoot
    ├── object[12] EnemyRoot
    ├── object[15] DebugRoot
    ├── object[17] KR001Enemy
    └── object[19] testSprite
```

MapRoot：

```text
object[6]
    │
    └── children
          │
          ▼
       object[7]
       LevelMap
```

LevelMap：

```text
object[7]
    │
    ├── object[8] UITransform
    ├── object[9] Sprite
    └── object[10] KR001MapLoader
```

所以：

```text
Canvas
 │
 └── MapRoot
      │
      └── LevelMap
           ├── UITransform
           ├── Sprite
           └── KR001MapLoader
```

---

# 20. LevelMap 的 KR001MapLoader 配置

scene 中：

```json
{
  "__type__": "2ac76+NrHJJ3Y+8csVcXEWR",
  ...
  "node": {
    "__id__": 7
  },
  ...
  "mapPath": "level1/map1/spriteFrame"
}
```

因此：

```text
LevelMap
   │
   └── KR001MapLoader
          │
          └── mapPath
               =
          level1/map1/spriteFrame
```

运行时 MapLoader 根据这个路径加载地图资源。

---

# 21. EnemyRoot

scene 中：

```text
object[12] = EnemyRoot
```

其 children：

```text
[]
```

components：

```text
object[13] UITransform
object[14] KR001EnemySpawner
```

对应：

```text
EnemyRoot
 ├── UITransform
 └── KR001EnemySpawner
```

Spawner 的配置：

```text
roadName = road1
spawnInterval = 2
enemySpeed = 80
maxEnemies = 10
```

---

# 22. EnemySpawner 与 PathLoader

运行日志明确出现：

```text
[KR001MapLoader] Loading map: level1/map1/spriteFrame

[PathLoader] Loading path: level1/road1

[EnemyFactory] Preloading walk sprites...
```

以及：

```text
[PathLoader] Loaded 66 waypoints for road1
```

所以运行过程至少可以确定包含：

```text
KR001MapLoader
      │
      └── map loading

KR001EnemySpawner
      │
      └── road1
            │
            ▼
        PathLoader
            │
            └── 66 waypoints
```

---

# 23. EnemyFactory

日志明确：

```text
[EnemyFactory] Preloading walk sprites...
```

随后：

```text
[EnemyFactory] No walk sprite frames found
```

因此 EnemyFactory 明确负责敌人的创建过程中：

```text
walk SpriteFrame 的加载 / 预加载
```

至少可以确认：

```text
EnemySpawner
      │
      ▼
EnemyFactory
      │
      ▼
walk SpriteFrames
```

当 walk frames 没有正确加载时：

```text
EnemyFactory
      │
      X
No walk sprite frames found
      │
      ▼
KR001EnemySpawner initialization failed
```

---

# 24. EnemyAnimator

从职责上它对应：

```text
SpriteFrame
      │
      ▼
EnemyAnimator
      │
      ▼
walk animation
```

它与：

```text
actor0_0
actor0_1
...
actor0_9
```

这样的 Frame 序列相关。

这里要注意：

> 目前讨论中没有完整贴出 `EnemyAnimator.ts` 的源代码，因此不能仅凭文件名断言它所有具体调用关系。

能够确定的是：

```text
EnemyAnimator
```

这个脚本是敌人动画逻辑对应的脚本，而实际具体调用链应该以源代码为最终依据。

---

# 25. KR001EnemyController

它对应：

```text
Enemy
   │
   ▼
KR001EnemyController
   │
   ├── 移动
   ├── 路径位置
   └── 敌人生命周期
```

同样：

> 具体哪些方法由谁调用，应该以 `KR001EnemyController.ts` 的实际代码为准。

不能仅凭文件名推断完整调用关系。

---

# 26. KR001SceneSetup

场景启动日志：

```text
[KR001SceneSetup] Scene initialized

[KR001SceneSetup] MapRoot: MapRoot

[KR001SceneSetup] EnemyRoot: EnemyRoot
```

因此可以确定：

```text
KR001SceneSetup
```

在场景初始化阶段执行，并且它会取得：

```text
MapRoot
EnemyRoot
```

这也是当前可以确定的场景级入口之一。

---

# 27. 当前运行日志揭示的启动顺序

一次运行日志：

```text
Cocos Creator v3.8.8

[KR001SceneSetup] Scene initialized
[KR001SceneSetup] MapRoot: MapRoot
[KR001SceneSetup] EnemyRoot: EnemyRoot

[KR001MapLoader] Loading map: level1/map1/spriteFrame

[PathLoader] Loading path: road1

[EnemyFactory] Preloading walk sprites...

[EnemyFactory] No walk sprite frames found

[KR001EnemySpawner] Failed to initialize:
    Error: [EnemyFactory] No walk sprite frames found

[PathLoader] Loaded 66 waypoints for road1

[KR001MapLoader] Map loaded: 700 x 600
```

因此运行时至少表现为：

```text
KR001SceneSetup
       │
       ├───────────────┐
       │               │
       ▼               ▼
  MapRoot          EnemyRoot
       │               │
       ▼               ▼
KR001MapLoader   KR001EnemySpawner
                       │
                       ├── PathLoader
                       │
                       └── EnemyFactory
                              │
                              └── walk SpriteFrames
```

---

# 28. EnemyFactory 报错对整个系统的影响

日志：

```text
[EnemyFactory] No walk sprite frames found
```

之后：

```text
[KR001EnemySpawner] Failed to initialize
```

所以：

```text
EnemyFactory
    │
    X
walk frames missing
    │
    ▼
EnemyFactory initialization / preload failure
    │
    ▼
KR001EnemySpawner initialization failure
```

地图仍然可以加载：

```text
[KR001MapLoader] Map loaded: 700 x 600
```

所以：

```text
地图系统
```

和：

```text
敌人生成系统
```

在运行时是相对独立的两个部分。

---

# 29. KR001.scene 中的 testSprite

scene 中还有：

```text
testSprite
```

其结构：

```text
testSprite
 ├── UITransform
 └── Sprite
```

Sprite 有明确的：

```json
"_spriteFrame": {
  "__uuid__": "0a6c3d0a-0dc0-4794-81c4-f05e387f0385@f9941",
  "__expectedType__": "cc.SpriteFrame"
}
```

这说明：

```text
testSprite
```

是一个非常有价值的资源显示测试节点。

它可以用来验证：

```text
PNG
→ Texture2D
→ SpriteFrame
→ Sprite
```

这一整条资源链是否正常。

---

# 30. Prefab 与 Scene 的区别

Prefab：

```text
KR001Enemy.prefab
```

描述的是：

```text
一个可重复实例化的敌人对象模板
```

Scene：

```text
KR001.scene
```

描述的是：

```text
整个关卡/场景对象结构
```

因此：

```text
Scene
 │
 ├── MapRoot
 ├── EnemyRoot
 ├── DebugRoot
 ├── KR001Enemy
 └── testSprite
```

而：

```text
KR001Enemy.prefab
```

应该负责：

```text
一个敌人的内部结构
```

例如：

```text
KR001Enemy
 ├── Sprite
 ├── Animator
 └── Controller
```

具体结构以当前 prefab 文件实际内容为准。

---

# 31. 为什么不能直接把参考项目的 monster0.prefab 原样复制

之前尝试：

```text
参考项目 monster0.prefab
        │
        ▼
复制到
assets/resources/prefabs/enemy/monster0.prefab
```

结果出现：

```text
Missing class:
fd612rCcO5GqopQOUeviCbD

Missing class:
88ea4NumMZGd5gFC7814wew
```

并且：

```text
Script "fd612rCcO5GqopQOUeviCbD" attached to "bg"
is missing or invalid.

Script "88ea4NumMZGd5gFC7814wew" attached to "monster0"
is missing or invalid.
```

这说明 prefab 不只是：

```text
Node + Sprite
```

它还可能包含：

```text
脚本组件
脚本 UUID
外部资源 UUID
Prefab 依赖
```

如果依赖来自另外一个项目：

```text
Reference Project
```

直接复制：

```text
monster0.prefab
```

并不能保证当前项目中存在完全相同的：

```text
script UUID
asset UUID
dependency
```

因此会出现：

```text
Missing class
```

---

# 32. 更可靠的 Prefab 重建方法

最终采用的思路是：

```text
不要直接复制整个旧 prefab
```

而是：

```text
保留当前项目资源
        │
        ▼
重新创建 Cocos Prefab
        │
        ├── Node
        ├── Sprite
        ├── SpriteFrame
        ├── Animation
        └── 当前项目自己的 Script
```

这样可以避免把参考项目中的：

```text
旧 script UUID
旧 class UUID
旧 asset dependency
```

一起带进当前项目。

---

# 33. 当前资源链

目前已经实际验证可以工作的资源链：

```text
actor0_0.png
     │
     ▼
Cocos import
     │
     ▼
Texture2D
     │
     ▼
SpriteFrame
     │
     ▼
Sprite
     │
     ▼
KR001Enemy.prefab
     │
     ▼
EnemyFactory
     │
     ▼
EnemySpawner
```

如果加入动画：

```text
actor0_0.png ─┐
actor0_1.png ─┤
actor0_2.png ─┤
...           ├──> SpriteFrames
actor0_9.png ─┘
                    │
                    ▼
               Animation
                    │
                    ▼
                 Sprite
                    │
                    ▼
             KR001Enemy.prefab
```

---

# 34. 当前最重要的 ID 体系

整个问题中有三类 ID：

## 34.1 文件/资源 UUID

例如：

```text
KR001MapLoader.ts.meta

uuid:
2ac76f8d-ac72-49dd-8fbc-72c55c5c4591
```

这是 Cocos 资源的 UUID。

---

## 34.2 Scene 序列化 __id__

例如：

```json
"node": {
  "__id__": 7
}
```

表示：

```text
引用 KR001.scene 序列化数组中的 object[7]
```

---

## 34.3 Cocos 对象自身 _id

例如 LevelMap：

```json
"_id": "6dUz79MFNFUbVm25+SHHeh"
```

这是对象自身的持久化 ID。

它不是：

```text
object[7]
```

也不是：

```text
KR001MapLoader UUID
```

---

# 35. 一个完整例子

以 LevelMap 为例：

```text
KR001.scene
│
├── object[6]
│     └── MapRoot
│
└── object[7]
      └── LevelMap
            │
            ├── object[8]
            │     └── UITransform
            │
            ├── object[9]
            │     └── Sprite
            │
            └── object[10]
                  └── KR001MapLoader
```

LevelMap 自己：

```text
object index:
7

object _id:
6dUz79MFNFUbVm25+SHHeh
```

KR001MapLoader：

```text
object index:
10

component node reference:
__id__ = 7

script UUID:
2ac76f8d-ac72-49dd-8fbc-72c55c5c4591

serialized __type__:
2ac76+NrHJJ3Y+8csVcXEWR
```

所以可以画成：

```text
KR001MapLoader.ts
      │
      │ meta.uuid
      ▼
2ac76f8d-ac72-49dd-8fbc-72c55c5c4591
      │
      │ Cocos serialized type
      ▼
2ac76+NrHJJ3Y+8csVcXEWR
      │
      │ scene object
      ▼
object[10]
      │
      │ node.__id__ = 7
      ▼
object[7]
      │
      ▼
LevelMap
```

这条链是目前已经被实际数据验证的。

---

# 36. 当前已确认的 KR001 架构

综合目前证据，可以确定一个核心结构：

```text
                         KR001 Scene
                              │
                              ▼
                           Canvas
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
       MapRoot            EnemyRoot          KR001SceneSetup
          │                   │
          ▼                   ▼
      LevelMap          KR001EnemySpawner
          │                   │
          │                   ├──────────────┐
          │                   │              │
          ▼                   ▼              ▼
  KR001MapLoader          PathLoader    EnemyFactory
          │                   │              │
          ▼                   ▼              ▼
  level1/map1/            road1          Walk Frames
  spriteFrame                │              │
                             ▼              ▼
                         66 waypoints   EnemyAnimator
                                            │
                                            ▼
                                      KR001Enemy
                                            │
                                            ▼
                                  KR001EnemyController
```

---

# 37. 但目前不能完全确定的地方

以下内容在没有对应 TS 源代码全文的情况下，不应该直接当作事实：

```text
KR001SceneSetup 调用了哪个具体方法
KR001EnemySpawner 调用了 EnemyFactory 的哪个具体方法
EnemyFactory 是否直接创建 KR001Enemy prefab
EnemyAnimator 是否由 KR001EnemyController 直接调用
KR001EnemyController 是否直接调用 PathLoader
```

这些必须通过：

```text
import
调用
new
instantiate
getComponent
find
schedule
start
onLoad
```

等实际源码来验证。

因此应该区分：

```text
Scene 序列化结构
```

和：

```text
TypeScript 运行时调用关系
```

前者目前已经可以从 `.scene` 直接证明。

后者需要进一步逐个读取 `.ts`。

---

# 38. 当前运行时入口的理解

从日志可以确认：

```text
KR001SceneSetup
```

是当前 KR001 场景初始化链中最先明显出现的业务脚本之一。

它负责确认：

```text
MapRoot
EnemyRoot
```

之后：

```text
KR001MapLoader
```

负责地图加载。

同时：

```text
KR001EnemySpawner
```

负责敌人生成系统初始化。

EnemySpawner 又涉及：

```text
PathLoader
EnemyFactory
```

最终：

```text
EnemyFactory
```

需要：

```text
walk SpriteFrames
```

因此当前运行流程可以理解为：

```text
Scene loaded
     │
     ▼
KR001SceneSetup
     │
     ├───────────────┐
     ▼               ▼
MapRoot          EnemyRoot
     │               │
     ▼               ▼
MapLoader       EnemySpawner
     │               │
     ▼               ├── PathLoader
Map loaded          │
                     └── EnemyFactory
                           │
                           ▼
                     Walk SpriteFrames
                           │
                           ▼
                       Enemy Prefab
                           │
                           ▼
                     EnemyController
                           │
                           ▼
                         Move
```

---

# 39. 当前最值得保留的调试原则

## 原则一：先确认 PNG

```text
PNG 是否真的存在
```

---

## 原则二：确认 meta

```text
PNG
 └── .meta
      ├── Texture UUID
      └── SpriteFrame UUID
```

---

## 原则三：确认 SpriteFrame

检查：

```text
rawTextureUuid
```

是否指向正确 Texture2D。

---

## 原则四：确认 Sprite

检查：

```text
Sprite._spriteFrame
```

是否指向正确 SpriteFrame。

---

## 原则五：确认 Prefab

检查：

```text
Prefab
 └── Sprite
      └── SpriteFrame
```

是否正常。

---

## 原则六：最后检查代码

如果：

```text
Prefab 可以正常显示
```

但运行时报：

```text
No walk sprite frames found
```

那么问题就不再是：

```text
PNG 是否有效
```

而应该重点检查：

```text
EnemyFactory
```

实际使用的：

```text
resources.load()
resources.loadDir()
asset bundle
路径
SpriteFrame 类型
```

等代码。

---

# 40. 最终结论

目前已经可以明确建立三层关系：

```text
第一层：Cocos Scene 序列化

KR001.scene
   │
   ├── Node
   └── Component
```

```text
第二层：Cocos UUID / Script 类型

KR001MapLoader.ts.meta
   │
   └── uuid
         │
         ▼
2ac76f8d-ac72-49dd-8fbc-72c55c5c4591
         │
         ▼
2ac76+NrHJJ3Y+8csVcXEWR
         │
         ▼
KR001.scene 的 __type__
```

```text
第三层：运行时逻辑

KR001SceneSetup
       │
       ├── Map
       │    └── KR001MapLoader
       │
       └── Enemy
            └── KR001EnemySpawner
                  ├── PathLoader
                  └── EnemyFactory
                        └── Walk SpriteFrames
```

最关键的认识是：

```text
__id__
```

不是：

```text
UUID
```

也不是：

```text Node._id
```

而是：

```text
当前 .scene 序列化数组中的对象索引
```

而：

```text
_id
```

是对象自己的持久化 ID。

脚本的：

```text
.meta -> uuid
```

则是另一套资源身份系统。

Cocos 会把脚本 UUID 转换成 scene 中的：

```text
__type__
```

形式。

因此，分析 Cocos `.scene` 文件时，应该始终同时维护：

```text
对象数组 index
        ↓
Node / Component

对象 _id
        ↓
Cocos 对象自身 ID

资源 meta.uuid
        ↓
资源 UUID

scene __type__
        ↓
脚本/组件 UUID 的序列化形式

component.node.__id__
        ↓
组件属于哪个 Node
```

这五者不能混为一谈。





# 我看完这 7 个脚本了。这里可以把**“谁启动、谁调用谁、资源怎么流动、敌人怎么生成”**明确下来。

最关键的一点先说：

> **当前真正的运行入口不是 `EnemyFactory`，而是场景里的 `KR001SceneSetup`、`KR001MapLoader`、`KR001EnemySpawner` 这几个挂在场景节点上的 Component。**
>
> 其中敌人生成链路的核心入口是 **`KR001EnemySpawner.start()`**。

下面完全按照你上传的源码分析，不对源码之外的东西做假设。

```markdown
# KR001 脚本启动顺序与调用关系分析

## 1. 当前脚本列表

本次分析的脚本：

- KR001SceneSetup.ts
- KR001MapLoader.ts
- KR001EnemySpawner.ts
- PathLoader.ts
- EnemyFactory.ts
- KR001EnemyController.ts
- EnemyAnimator.ts

整体可以分成三个系统：

1. 场景初始化系统
   - KR001SceneSetup

2. 地图 / 路径系统
   - KR001MapLoader
   - PathLoader

3. 敌人系统
   - KR001EnemySpawner
   - EnemyFactory
   - KR001EnemyController
   - EnemyAnimator


---

# 2. 最重要的运行结构

整体关系可以简化成：

KR001.scene
    |
    +-- Canvas
    |     |
    |     +-- KR001SceneSetup
    |
    +-- MapRoot
    |     |
    |     +-- LevelMap
    |           |
    |           +-- Sprite
    |           +-- KR001MapLoader
    |
    +-- EnemyRoot
    |     |
    |     +-- KR001EnemySpawner
    |
    +-- DebugRoot


运行后：

KR001SceneSetup.start()
        |
        +-- 调整 EnemyRoot 与 MapRoot 的坐标关系


KR001MapLoader.start()
        |
        +-- resources.load("level1/map1/spriteFrame")
        |
        +-- Sprite.spriteFrame = map SpriteFrame
        |
        +-- 设置地图尺寸


KR001EnemySpawner.start()
        |
        +-- PathLoader.load("road1")
        |
        |       +-- resources.load("level1/road1", JsonAsset)
        |       +-- JSON -> Vec2[]
        |
        +-- EnemyFactory.preload()
                |
                +-- resources.load(
                |       "prefabs/enemy/KR001Enemy",
                |       Prefab
                |   )
                |
                +-- 缓存 Prefab


EnemySpawner.update()
        |
        +-- 到达 spawnInterval
        |
        +-- spawnEnemy()
                |
                +-- EnemyFactory.createEnemy()
                |       |
                |       +-- instantiate(prefab)
                |
                +-- 获取 KR001EnemyController
                |
                +-- controller.init(path, speed)
                        |
                        +-- 设置敌人初始位置
                        +-- 开始沿 waypoint 移动


KR001EnemyController.update()
        |
        +-- 每帧移动
        |
        +-- 到达最后 waypoint
                |
                +-- onReachedExit()
                +-- node.destroy()
```

---

# 3. 谁是真正的入口？

这里要区分两个概念。

## 3.1 Cocos 场景级入口

`KR001.scene` 加载后，挂在场景节点上的 Component 会进入 Cocos 生命周期。

目前源码明确说明：

### Canvas

Canvas 上应该挂：

```text
KR001SceneSetup
```

`KR001SceneSetup.ts` 的注释明确写：

```text
Attach this to the Canvas/root node of KR001.scene.
```

并且它定义的场景结构是：

```text
Canvas
├── Main Camera
├── MapRoot
│   └── LevelMap
├── EnemyRoot
└── DebugRoot
```

来源：

KR001SceneSetup.ts


---

# 4. KR001SceneSetup 是什么角色？

它是：

```text
场景协调器 / Root Controller
```

但它不是敌人系统真正的启动器。

它的 `start()` 做的事情非常少：

```ts
start(): void {
    log('[KR001SceneSetup] Scene initialized');

    ...

    if (this.enemyRoot && this.mapRoot) {
        const mapPos = this.mapRoot.getPosition();
        this.enemyRoot.setPosition(mapPos);
    }
}
```

也就是说：

```text
KR001SceneSetup
        |
        +-- 找到 MapRoot
        |
        +-- 找到 EnemyRoot
        |
        +-- 让 EnemyRoot 和 MapRoot 保持相同位置
```

它没有：

```text
EnemyFactory.preload()
PathLoader.load()
EnemyFactory.createEnemy()
```

所以：

> KR001SceneSetup 并不负责真正启动敌人。

它主要负责场景级坐标关系。

---

# 5. 地图系统启动

地图节点：

```text
MapRoot
└── LevelMap
    ├── UITransform
    ├── Sprite
    └── KR001MapLoader
```

`KR001MapLoader.ts` 明确说明：

```text
Attach this to the LevelMap node.
```

所以：

```text
LevelMap
    |
    +-- KR001MapLoader.start()
```

---

# 6. KR001MapLoader.start()

它的启动非常直接：

```ts
start(): void {
    this.loadMap();
}
```

然后：

```ts
private loadMap(): void {
    resources.load(
        this.mapPath,
        SpriteFrame,
        ...
    );
}
```

默认资源路径：

```text
level1/map1/spriteFrame
```

加载成功之后：

```ts
this.setupMap(spriteFrame);
```

最终：

```ts
sprite.spriteFrame = spriteFrame;
sprite.sizeMode = Sprite.SizeMode.RAW;
```

然后读取：

```ts
const texture = spriteFrame.texture;
this._mapWidth = texture.width;
this._mapHeight = texture.height;
```

最后设置：

```ts
uiTransform.setContentSize(
    new Size(this._mapWidth, this._mapHeight)
);
```

所以地图加载链：

```text
LevelMap
  |
  +-- KR001MapLoader.start()
        |
        +-- loadMap()
              |
              +-- resources.load(
              |      "level1/map1/spriteFrame",
              |      SpriteFrame
              |   )
              |
              +-- setupMap()
                    |
                    +-- Sprite.spriteFrame = SpriteFrame
                    +-- 获取 texture.width / height
                    +-- 设置 UITransform 尺寸
```

来源：

KR001MapLoader.ts


---

# 7. PathLoader 是谁调用的？

非常重要：

`PathLoader` 自己不是 Component。

它没有：

```ts
@ccclass
extends Component
```

而是：

```ts
export class PathLoader
```

所以它没有自己的：

```text
start()
update()
```

它是一个工具类。

真正调用它的是：

```text
KR001EnemySpawner
```

源码中明确：

```ts
import { PathLoader } from './PathLoader';
```

并且：

```ts
PathLoader.load(this.roadName)
```

来源：

KR001EnemySpawner.ts


---

# 8. PathLoader.load() 做什么？

调用：

```ts
PathLoader.load('road1')
```

内部生成：

```text
level1/road1
```

然后：

```ts
resources.load(resourcePath, JsonAsset, ...)
```

也就是：

```text
resources
└── level1
    └── road1
```

加载 JSON。

然后：

```ts
const data = jsonAsset.json as unknown as RoadData;
```

从：

```text
data.points
```

生成：

```ts
Vec2[]
```

即：

```text
JSON points
    |
    v
{ x, y }
{ x, y }
{ x, y }
...
    |
    v
Vec2[]
```

最终返回：

```ts
Promise<Vec2[]>
```

所以：

```text
PathLoader
    |
    +-- 读取 level1/road1
    |
    +-- JSON
    |
    +-- points
    |
    +-- Vec2[]
    |
    +-- 返回给 KR001EnemySpawner
```

来源：

PathLoader.ts


---

# 9. 敌人系统真正的入口：KR001EnemySpawner

这是当前敌人系统最重要的入口。

`KR001EnemySpawner.ts` 明确说明：

```text
Attach this to EnemyRoot node in KR001.scene.
```

所以：

```text
EnemyRoot
    |
    +-- KR001EnemySpawner
```

这是敌人生成系统进入运行状态的地方。

---

# 10. KR001EnemySpawner.start()

这是整个敌人系统最关键的一段：

```ts
async start() {
    try {
        const [path] = await Promise.all([
            PathLoader.load(this.roadName),
            EnemyFactory.preload()
        ]);

        this._path = path;
        this._isReady = true;
        this._timer = this.spawnInterval;
    } catch (e) {
        error(...);
    }
}
```

这里有一个非常重要的结论：

## PathLoader 和 EnemyFactory 是并行加载

不是：

```text
PathLoader
    ↓
EnemyFactory
    ↓
Spawner
```

而是：

```text
             ┌── PathLoader.load("road1")
             │
Spawner.start()
             │
             └── EnemyFactory.preload()
             
             ↓
        Promise.all()
             
             ↓
         _isReady=true
```

也就是说：

```text
KR001EnemySpawner.start()
        |
        +----------------------+
        |                      |
        v                      v
PathLoader.load()       EnemyFactory.preload()
        |                      |
        v                      v
 level1/road1          KR001Enemy.prefab
        |                      |
        +----------+-----------+
                   |
                   v
              Promise.all
                   |
                   v
             _isReady=true
```

---

# 11. EnemyFactory 的角色

`EnemyFactory` 不是 Component。

它是：

```text
敌人 Prefab 工厂 / Prefab 缓存器
```

它不负责：

```text
路径
移动
动画
生成计时
```

它只负责：

```text
加载 Prefab
实例化 Prefab
```

源码明确：

```ts
private static readonly PREFAB_PATH =
    'prefabs/enemy/KR001Enemy';
```

---

# 12. EnemyFactory.preload()

调用：

```ts
EnemyFactory.preload()
```

最终：

```ts
resources.load(
    EnemyFactory.PREFAB_PATH,
    Prefab,
    ...
)
```

也就是：

```text
resources
└── prefabs
    └── enemy
        └── KR001Enemy.prefab
```

成功后：

```ts
EnemyFactory._prefab = prefab;
```

所以：

```text
EnemyFactory.preload()
        |
        +-- resources.load()
        |
        +-- KR001Enemy.prefab
        |
        +-- _prefab 缓存
```

---

# 13. EnemyFactory.createEnemy()

真正生成敌人时：

```ts
const enemyNode = EnemyFactory.createEnemy();
```

内部只有：

```ts
const node = instantiate(EnemyFactory._prefab);
return node;
```

所以：

```text
KR001Enemy.prefab
        |
        v
instantiate()
        |
        v
Enemy Node
```

非常重要：

> EnemyFactory 不创建 Sprite。
>
> EnemyFactory 不扫描 walk 图片。
>
> EnemyFactory 不创建动画帧。
>
> EnemyFactory 不控制敌人移动。

当前源码已经明确写了：

```text
EnemyFactory does NOT:
- Scan for walk sprite frames
- Create Sprite components
- Manage animation frames
```

来源：

EnemyFactory.ts


---

# 14. 敌人真正生成的位置

`KR001EnemySpawner.update()`：

```ts
if (!this._isReady) return;

this._timer += dt;

if (this._timer >= this.spawnInterval) {
    this._timer = 0;
    this.spawnEnemy();
}
```

所以：

```text
Spawner.start()
    |
    +-- 加载资源
    |
    +-- _isReady = true
          |
          v
Spawner.update()
    |
    +-- timer
    |
    +-- 到 spawnInterval
          |
          v
      spawnEnemy()
```

默认：

```text
spawnInterval = 2 秒
```

---

# 15. spawnEnemy() 的完整过程

核心代码：

```ts
const enemyNode = EnemyFactory.createEnemy();
```

然后：

```ts
enemyNode.name = `Enemy_${this._spawnedCount}`;
enemyNode.setParent(this.node);
```

因此生成出来的敌人会被放到：

```text
EnemyRoot
└── Enemy_1
└── Enemy_2
└── Enemy_3
...
```

然后：

```ts
let controller =
    enemyNode.getComponent(KR001EnemyController);
```

如果 Prefab 没有：

```text
KR001EnemyController
```

则动态添加：

```ts
controller = enemyNode.addComponent(
    KR001EnemyController
);
```

最后：

```ts
controller.init(this._path, this.enemySpeed);
```

因此完整链路：

```text
spawnEnemy()
    |
    +-- EnemyFactory.createEnemy()
    |       |
    |       +-- instantiate(KR001Enemy.prefab)
    |       |
    |       v
    |     enemyNode
    |
    +-- setParent(EnemyRoot)
    |
    +-- getComponent(KR001EnemyController)
    |
    +-- 如果没有则 addComponent()
    |
    +-- controller.init(path, speed)
```

来源：

KR001EnemySpawner.ts


---

# 16. KR001EnemyController 的角色

这个 Component 负责：

```text
敌人移动
```

它明确不负责：

```text
HP
damage
death
attack
combat
animation
```

源码注释明确写：

```text
This component does NOT handle:
- HP / damage / death
- Attack / combat
- Animation
```

来源：

KR001EnemyController.ts


---

# 17. KR001EnemyController.init()

Spawner 调：

```ts
controller.init(this._path, this.enemySpeed);
```

Controller 收到：

```text
Vec2[] path
speed
```

然后：

```ts
this._path = path;
this._currentIndex = 1;
```

并把敌人放到：

```ts
const start = path[0];

this.node.setPosition(
    start.x,
    start.y,
    0
);
```

最后：

```ts
this._isMoving = true;
```

因此：

```text
PathLoader
    |
    v
Vec2[]
    |
    v
EnemySpawner
    |
    v
EnemyController.init()
    |
    +-- path
    +-- speed
    |
    +-- node.setPosition(path[0])
    |
    +-- _isMoving=true
```

---

# 18. KR001EnemyController.update()

之后每帧由 Cocos 自动调用：

```ts
update(dt)
```

Controller 计算：

```text
当前位置
    +
目标 waypoint
    +
moveSpeed * dt
```

然后移动。

当：

```ts
_currentIndex >= this._path.length
```

表示到达终点。

然后：

```ts
this._isMoving = false;
```

调用：

```ts
this.onReachedExit();
```

最后：

```ts
this.node.destroy();
```

所以敌人生命周期：

```text
Prefab
  |
  v
instantiate
  |
  v
Enemy Node
  |
  v
KR001EnemyController.init()
  |
  v
移动
  |
  v
Waypoint 1
  |
  v
Waypoint 2
  |
  v
...
  |
  v
最后 waypoint
  |
  +-- onReachedExit()
  |
  +-- node.destroy()
```

---

# 19. onReachedExit 的调用关系

Spawner 创建 Controller 后：

```ts
controller.onReachedExit = () => {
    this._activeEnemies--;
};
```

所以：

```text
KR001EnemyController
        |
        | 到达终点
        v
onReachedExit()
        |
        v
KR001EnemySpawner
        |
        +-- _activeEnemies--
```

这里形成了一个反向通知：

```text
Spawner
   |
   | 创建
   v
Controller
   |
   | 到达终点
   v
Spawner
```

---

# 20. EnemyAnimator 的特殊位置

`EnemyAnimator.ts` 与上面的移动系统是相对独立的。

它：

```ts
@ccclass('EnemyAnimator')
export class EnemyAnimator extends Component
```

所以它是一个普通 Cocos Component。

它依赖：

```ts
Sprite
SpriteFrame[]
```

启动时：

```ts
start(): void {
    this._sprite = this.getComponent(Sprite);
}
```

也就是说：

```text
EnemyAnimator
    |
    +-- 要求当前 Node 上有 Sprite
```

---

# 21. EnemyAnimator 如何播放动画

它有：

```ts
public frames: SpriteFrame[] = [];
```

然后每帧：

```ts
update(dt)
```

计算：

```ts
frameDuration = 1 / fps
```

达到时间后：

```ts
_frameIndex =
    (_frameIndex + 1) % this.frames.length;
```

然后：

```ts
this._sprite.spriteFrame =
    this.frames[this._frameIndex];
```

所以：

```text
EnemyAnimator
    |
    +-- Sprite
    |
    +-- frames[]
    |     |
    |     +-- actor0_0
    |     +-- actor0_1
    |     +-- actor0_2
    |     +-- ...
    |
    +-- fps
          |
          v
      update()
          |
          v
    Sprite.spriteFrame
```

来源：

EnemyAnimator.ts


---

# 22. 一个非常重要的结论：当前代码中谁负责给 EnemyAnimator.frames 赋值？

在你上传的这 7 个文件中：

```text
没有发现。
```

`EnemyAnimator` 自己只是定义：

```ts
public frames: SpriteFrame[] = [];
```

而源码注释说：

```text
Sprite frames to cycle through (set by EnemyFactory)
```

但是当前的 `EnemyFactory.ts` 实际代码并没有：

```ts
enemyAnimator.frames = ...
```

反而明确说明：

```text
EnemyFactory does NOT:
- Scan for walk sprite frames
- Manage animation frames
```

因此这里存在一个非常明确的代码现状：

```text
EnemyAnimator
    |
    +-- 有 frames[]
    |
    +-- 可以播放 frames[]
    |
    X
    |
    +-- 当前上传的 EnemyFactory 并没有给它赋值
```

所以仅根据目前这 7 个源码：

> **EnemyAnimator 的动画帧来源在当前代码中没有形成完整调用链。**

这点不能猜测成“Prefab 一定已经配置好了”。

如果 Prefab 上已经通过 Inspector/序列化数据给 `EnemyAnimator.frames` 配好了，那么可以工作；但这个信息不在这 7 个 TS 文件里。

---

# 23. 当前真正完整的调用链

## 场景初始化

```text
KR001.scene
    |
    +-- Canvas
    |     |
    |     +-- KR001SceneSetup.start()
    |
    +-- MapRoot
    |     |
    |     +-- LevelMap
    |           |
    |           +-- KR001MapLoader.start()
    |
    +-- EnemyRoot
          |
          +-- KR001EnemySpawner.start()
```

---

# 24. 地图调用链

```text
KR001MapLoader.start()
        |
        v
loadMap()
        |
        v
resources.load(
    "level1/map1/spriteFrame",
    SpriteFrame
)
        |
        v
setupMap()
        |
        +-- Sprite.spriteFrame = spriteFrame
        |
        +-- texture.width
        +-- texture.height
        |
        +-- UITransform.setContentSize()
```

---

# 25. 路径调用链

```text
KR001EnemySpawner.start()
        |
        v
PathLoader.load("road1")
        |
        v
resources.load(
    "level1/road1",
    JsonAsset
)
        |
        v
RoadData.points
        |
        v
Vec2[]
        |
        v
Spawner._path
```

---

# 26. Prefab 加载链

```text
KR001EnemySpawner.start()
        |
        v
EnemyFactory.preload()
        |
        v
resources.load(
    "prefabs/enemy/KR001Enemy",
    Prefab
)
        |
        v
EnemyFactory._prefab
```

---

# 27. 敌人生成链

```text
KR001EnemySpawner.update()
        |
        | timer >= spawnInterval
        v
spawnEnemy()
        |
        v
EnemyFactory.createEnemy()
        |
        v
instantiate(KR001Enemy.prefab)
        |
        v
enemyNode
        |
        +-- setParent(EnemyRoot)
        |
        +-- KR001EnemyController
        |
        +-- controller.init(path, speed)
```

---

# 28. 敌人运动链

```text
KR001EnemyController.init()
        |
        +-- 保存 path
        +-- 设置 speed
        +-- 设置初始位置
        +-- _isMoving=true
        |
        v
KR001EnemyController.update()
        |
        +-- waypoint movement
        |
        +-- 最终 waypoint
                |
                +-- onReachedExit()
                |
                +-- node.destroy()
```

---

# 29. 目前脚本之间的依赖关系

可以画成：

```text
                    KR001.scene
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
 KR001SceneSetup  KR001MapLoader  KR001EnemySpawner
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
                    PathLoader              EnemyFactory
                         |                         |
                         v                         v
                    level1/road1           KR001Enemy.prefab
                                                   |
                                                   v
                                             Enemy Node
                                                   |
                                                   v
                                      KR001EnemyController
                                                   |
                                                   v
                                               movement
```

动画则是另外一条：

```text
KR001Enemy.prefab
       |
       +-- Sprite
       |
       +-- EnemyAnimator
               |
               +-- SpriteFrame[]
               |
               +-- Sprite.spriteFrame
```

但：

```text
EnemyFactory
     X
     |
     X 当前源码没有给 EnemyAnimator.frames 赋值
```

---

# 30. 谁调用谁 —— 精确表

| 调用者 | 被调用者 | 调用方式 | 作用 |
|---|---|---|---|
| Cocos 生命周期 | KR001SceneSetup.start | 自动 | 场景初始化 |
| Cocos 生命周期 | KR001MapLoader.start | 自动 | 加载地图 |
| Cocos 生命周期 | KR001EnemySpawner.start | 自动 | 初始化敌人系统 |
| KR001MapLoader | resources.load | 直接 | 加载地图 SpriteFrame |
| KR001EnemySpawner | PathLoader.load | 直接 | 加载道路 |
| KR001EnemySpawner | EnemyFactory.preload | 直接 | 加载敌人 Prefab |
| KR001EnemySpawner | EnemyFactory.createEnemy | 直接 | 创建敌人实例 |
| KR001EnemySpawner | KR001EnemyController.init | 直接 | 初始化敌人移动 |
| KR001EnemyController | onReachedExit | callback | 通知 Spawner 敌人离场 |
| KR001EnemyController | node.destroy | 直接 | 销毁敌人 |
| EnemyAnimator | Sprite.spriteFrame | 直接 | 切换动画帧 |

---

# 31. 启动顺序需要特别注意

这里不能简单写成：

```text
SceneSetup
  ↓
MapLoader
  ↓
EnemySpawner
```

因为这几个都是挂在场景节点上的 Component，并且各自有自己的 `start()`。

从源码可以确定：

```text
KR001SceneSetup.start()
KR001MapLoader.start()
KR001EnemySpawner.start()
```

都会由 Cocos 生命周期触发。

但是：

> 仅凭这 7 个 TS 文件，不能证明这三个 `start()` 之间的严格执行先后顺序。

能够确定的是：

```text
EnemySpawner.start()
    |
    +-- PathLoader.load()
    +-- EnemyFactory.preload()
```

这两个加载是明确的并行关系。

所以正确表达应该是：

```text
场景启动
   |
   +-- SceneSetup.start()
   |
   +-- MapLoader.start()
   |
   +-- EnemySpawner.start()
           |
           +-- PathLoader.load()
           |
           +-- EnemyFactory.preload()
                    |
                    +-- Promise.all()
                           |
                           v
                       _isReady=true
```

而不是人为假设一个严格的：

```text
SceneSetup
→ MapLoader
→ Spawner
```

顺序。

---

# 32. 当前系统的职责边界

## KR001SceneSetup

职责：

```text
场景级协调
MapRoot / EnemyRoot 坐标同步
```

不负责：

```text
敌人生成
路径加载
地图资源加载
动画
```

---

## KR001MapLoader

职责：

```text
地图 SpriteFrame 加载
地图 Sprite 设置
地图尺寸设置
```

不负责：

```text
道路
敌人
敌人生成
```

---

## PathLoader

职责：

```text
加载道路 JSON
转换为 Vec2[]
```

不负责：

```text
敌人
移动
生成
```

---

## KR001EnemySpawner

职责：

```text
加载路径
加载 Prefab
按时间生成敌人
设置 EnemyController
统计敌人
```

它是：

```text
敌人系统的主要运行入口
```

---

## EnemyFactory

职责：

```text
Prefab preload
Prefab instantiate
```

不负责：

```text
Sprite 创建
动画帧扫描
动画管理
路径
移动
```

---

## KR001EnemyController

职责：

```text
敌人沿 waypoint 移动
到达终点
销毁自身
通知 Spawner
```

---

## EnemyAnimator

职责：

```text
SpriteFrame[] 播放
```

但当前源码中：

```text
frames[] 的实际赋值来源没有形成完整代码调用链。
```

---

# 33. 最终的系统架构

当前 KR001 可以理解成：

```text
                    ┌─────────────────────┐
                    │     KR001.scene     │
                    └──────────┬──────────┘
                               |
             ┌─────────────────┼─────────────────┐
             |                 |                 |
             v                 v                 v
     KR001SceneSetup    KR001MapLoader   KR001EnemySpawner
             |                 |                 |
             |                 v                 |
             |          map SpriteFrame           |
             |                                   |
             |                         ┌─────────┴─────────┐
             |                         |                   |
             |                         v                   v
             |                    PathLoader         EnemyFactory
             |                         |                   |
             |                         v                   v
             |                    Vec2[]             Prefab
             |                                             |
             |                                             v
             |                                        Enemy Node
             |                                             |
             |                              ┌──────────────┴──────────────┐
             |                              |                             |
             |                              v                             v
             |                    KR001EnemyController             EnemyAnimator
             |                              |                             |
             |                              v                             v
             |                         Movement                    SpriteFrame[]
             |                              |
             |                              v
             |                         node.destroy()
             |
             v
       Coordinate setup
```

---

# 34. 最关键的结论

当前代码可以非常明确地确定：

1. `KR001.scene` 是整个实验场景。

2. `KR001SceneSetup` 是场景级协调 Component。

3. `KR001MapLoader` 挂在 `LevelMap` 上，负责加载地图。

4. `KR001EnemySpawner` 挂在 `EnemyRoot` 上，是敌人生成系统真正的运行入口。

5. `KR001EnemySpawner.start()` 同时启动：
   - `PathLoader.load("road1")`
   - `EnemyFactory.preload()`

6. `PathLoader` 负责：
   ```text
   level1/road1
   →
   JsonAsset
   →
   Vec2[]
   ```

7. `EnemyFactory` 负责：
   ```text
   prefabs/enemy/KR001Enemy
   →
   Prefab
   →
   instantiate()
   ```

8. `KR001EnemySpawner` 把 Prefab 实例化出来后，给它设置：
   ```text
   Parent = EnemyRoot
   KR001EnemyController
   path
   speed
   ```

9. `KR001EnemyController` 负责实际移动。

10. `KR001EnemyController` 到达终点后：
    ```text
    onReachedExit()
    →
    node.destroy()
    ```

11. `EnemyAnimator` 是独立的动画 Component。

12. 当前提供的源码中，没有找到 `EnemyFactory` 给 `EnemyAnimator.frames` 赋值的代码。

13. 因此动画资源链目前只能确定：
    ```text
    EnemyAnimator
       →
    SpriteFrame[]
       →
    Sprite.spriteFrame
    ```
    但不能仅凭这 7 个 TS 文件证明 `SpriteFrame[]` 是在哪里注入的。

14. 同样，`KR001.scene` 中具体 Component 的序列化 UUID / `__type__` 与 TS `.meta` UUID 的映射，是 Cocos 序列化层面的另一层问题，不能从这些 TS 文件本身推导。

15. 所以分析 Cocos Scene 时，应严格区分：
    ```text
    Node 在 scene 数组中的 __id__
    Node 自己的 _id
    Component 的 __id__
    Component 自己的 _id
    TypeScript script 的 UUID
    Cocos 序列化后的 __type__
    ```
    这些不是同一个 ID 系统。
```

有一点尤其值得你现在记住：**敌人系统的主链已经非常清楚了，就是 `KR001EnemySpawner → EnemyFactory → Prefab → KR001EnemyController`；`EnemyAnimator` 目前并没有被这条链上的任何 TS 代码显式调用。** 这很可能就是我们下一步检查“Prefab 里动画到底有没有真正接上”的关键。