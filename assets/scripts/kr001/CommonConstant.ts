/**
 * 项目通用常量。
 * 资源路径、游戏配置、动画参数、事件名等都集中在这里。
 */
export class CommonConstant {

    // ═══ Resource Paths (resources.load 使用) ═══════════

    static readonly PREFAB_BUILD_POINT = 'prefabs/builder/KR001BuildPoint';
    static readonly PREFAB_BUILDER     = 'prefabs/builder/KR001Builder';
    static readonly PREFAB_ENEMY       = 'prefabs/enemy/KR001Enemy';

    // Tower prefabs
    static readonly PREFAB_TOWER_ARROW     = 'prefabs/tower/ArrowTower';
    static readonly PREFAB_TOWER_BARRACK   = 'prefabs/tower/BarrackTower';
    static readonly PREFAB_TOWER_MAGICLAN  = 'prefabs/tower/MagiclanTower';
    static readonly PREFAB_TOWER_ARTILLERY = 'prefabs/tower/ArtilleryTower';

    // Soldier prefab (spawned by barrack)
    static readonly PREFAB_SOLDIER = 'prefabs/tower/Soldier';

    /** Number of soldiers spawned per barrack */
    static readonly BARRACK_SOLDIER_COUNT = 4;

    /** Soldier spawn offset from barrack center (reference: outSoldierPos 2,-16) */
    static readonly BARRACK_SOLDIER_OFFSET_X = 2;
    static readonly BARRACK_SOLDIER_OFFSET_Y = -16;

    /** Soldier spread spacing around spawn point */
    static readonly SOLDIER_SPREAD = 12;

    static readonly MAP_LEVEL1         = 'level1/map1/spriteFrame';

    /** 返回关卡配置路径: `level{N}/levelConfig` */
    static levelConfig(levelNum: number): string {
        return `level${levelNum}/levelConfig`;
    }

    /** 返回路径数据路径: `level{N}/{roadName}` */
    static roadData(levelNum: number, roadName: string): string {
        return `level${levelNum}/${roadName}`;
    }

    // ═══ Animation ══════════════════════════════════════

    /** 建筑选择菜单弹出/隐藏动画时长（秒） */
    static readonly BUILDER_ANIM_DURATION = 0.15;

    // ═══ Build Types ════════════════════════════════════

    /** Map from build type name to prefab resource path */
    static readonly TOWER_PREFAB_MAP: Record<string, string> = {
        'arrow':     CommonConstant.PREFAB_TOWER_ARROW,
        'barrack':   CommonConstant.PREFAB_TOWER_BARRACK,
        'magiclan':  CommonConstant.PREFAB_TOWER_MAGICLAN,
        'artillery': CommonConstant.PREFAB_TOWER_ARTILLERY,
    };

    // ═══ Tower Attack Config ═════════════════════════════

    // Bullet prefabs (specific per tower type)
    static readonly PREFAB_ARROW_BULLET     = 'prefabs/tower/ArrowBullet';
    static readonly PREFAB_MAGICLAN_BULLET  = 'prefabs/tower/MagiclanBullet';
    static readonly PREFAB_ARTILLERY_BULLET = 'prefabs/tower/ArtilleryBullet';

    // Arrow Tower
    static readonly ARROW_SHOOT_RANGE = 150;
    static readonly ARROW_BULLET_SPEED = 300;
    static readonly ARROW_COOLDOWN = 1.0;

    // Magiclan Tower
    static readonly MAGICLAN_SHOOT_RANGE = 170;
    static readonly MAGICLAN_BULLET_SPEED = 250;
    static readonly MAGICLAN_COOLDOWN = 1.5;

    // Artillery Tower
    static readonly ARTILLERY_SHOOT_RANGE = 200;
    static readonly ARTILLERY_BULLET_SPEED = 200;
    static readonly ARTILLERY_COOLDOWN = 2.5;

    // ═══ Scene Node Names ════════════════════════════════

    static readonly NODE_ENEMY_ROOT = 'EnemyRoot';

    // ═══ Game Config ════════════════════════════════════

    // (后续添加：初始金币、波次间隔、塔售价回收率等)
}
