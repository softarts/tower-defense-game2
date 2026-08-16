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

    // Game config
    static readonly GAME_CONFIG = 'gameConfig';

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
    static readonly ARROW_BULLET_SPEED = 120;
    static readonly ARROW_COOLDOWN = 1.5;
    static readonly ARROW_ATTACK = 4;  // reference: gameConfig.dataOfTower.arrowTower[0].attack

    // Magiclan Tower
    static readonly MAGICLAN_SHOOT_RANGE = 170;
    static readonly MAGICLAN_BULLET_SPEED = 150;
    static readonly MAGICLAN_COOLDOWN = 1.8;
    static readonly MAGICLAN_ATTACK = 8;

    // Artillery Tower
    static readonly ARTILLERY_SHOOT_RANGE = 200;
    static readonly ARTILLERY_BULLET_SPEED = 120;
    static readonly ARTILLERY_COOLDOWN = 3.0;
    static readonly ARTILLERY_ATTACK = 6;
    static readonly ARTILLERY_BOMB_RANGE = 50;

    // ═══ Scene Node Names ════════════════════════════════

    static readonly NODE_ENEMY_ROOT = 'EnemyRoot';

    // ═══ Barrack Tower ══════════════════════════════════════

    static readonly BARRACK_MAX_SOLDIERS = 3;
    static readonly BARRACK_SPAWN_COOLDOWN = 3.0;

    // ═══ Soldier ════════════════════════════════════════════

    static readonly SOLDIER_SPEED = 40;
    static readonly SOLDIER_ATTACK_RANGE = 18;
    static readonly SOLDIER_INVESTIGATE_RANGE = 80;
    static readonly SOLDIER_ATTACK_DAMAGE = 5;
    static readonly SOLDIER_ATTACK_INTERVAL = 1.0;
    static readonly SOLDIER_HP = 20;

    // ═══ Game Config ════════════════════════════════════

    // (后续添加：初始金币、波次间隔、塔售价回收率等)
}
