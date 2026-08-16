import { _decorator, Component, Node, log, warn, resources, Prefab, instantiate, Vec3 } from 'cc';
import { LevelDataManager, LevelData } from './LevelDataManager';
import { KR001BuildPoint } from './KR001BuildPoint';
import { KR001Builder } from './KR001Builder';
import { CommonConstant } from './CommonConstant';
import { GameDataStorage } from './GameDataStorage';

const { ccclass, property } = _decorator;

/**
 * KR001SceneSetup is the root controller for the KR001 experiment scene.
 * 
 * Attach this to the Canvas/root node of KR001.scene.
 * It references the key child nodes and coordinates initialization.
 * 
 * Startup flow (mirrors reference project levelScene.ts):
 * 1. onLoad: basic node references ready
 * 2. start: load level data via LevelDataManager, then initialize subsystems
 * 
 * Expected scene hierarchy:
 * 
 * Canvas (with KR001SceneSetup)
 * ├── Main Camera
 * ├── MapRoot
 * │   └── LevelMap (with Sprite + KR001MapLoader)
 * ├── BuildRoot (build point markers)
 * ├── EnemyRoot (with KR001EnemySpawner)
 * └── DebugRoot
 */
@ccclass('KR001SceneSetup')
export class KR001SceneSetup extends Component {

    @property({ type: Node, tooltip: 'MapRoot node containing the level map' })
    mapRoot: Node | null = null;

    @property({ type: Node, tooltip: 'BuildRoot node for build point markers' })
    buildRoot: Node | null = null;

    @property({ type: Node, tooltip: 'EnemyRoot node for spawning enemies' })
    enemyRoot: Node | null = null;

    @property({ type: Node, tooltip: 'DebugRoot node for debug visuals' })
    debugRoot: Node | null = null;

    /** Current level number to load. Can be set before scene starts. */
    private _levelNum: number = 1;

    /** Cached reference to the loaded level data */
    private _levelData: LevelData | null = null;

    /** Shared KR001Builder instance for the build menu */
    private _builder: KR001Builder | null = null;

    start(): void {
        log('[KR001SceneSetup] Scene initialized');
        log(`[KR001SceneSetup] MapRoot: ${this.mapRoot?.name || 'not set'}`);
        log(`[KR001SceneSetup] BuildRoot: ${this.buildRoot?.name || 'not set'}`);
        log(`[KR001SceneSetup] EnemyRoot: ${this.enemyRoot?.name || 'not set'}`);

        // Load level data first, then proceed with scene building.
        // This mirrors the reference project's levelScene.buildScene() flow:
        // load resources -> get level data -> initialize subsystems.
        this.loadLevelAndInit();
    }

    /**
     * Load level configuration via LevelDataManager, then initialize scene subsystems.
     * Follows the same pattern as the reference project:
     *   levelScene.start() -> buildScene() -> LevelDataManager.getLevelData() -> init()
     */
    private async loadLevelAndInit(): Promise<void> {
        log(`[KR001SceneSetup] Loading game config and level ${this._levelNum} data...`);

        try {
            // Load global game config first (reference: GameDataStorage.init at game start)
            await GameDataStorage.load();
            log('[KR001SceneSetup] GameDataStorage loaded');
        } catch (err) {
            warn(`[KR001SceneSetup] Failed to load game config: ${err}`);
            // Continue anyway — non-fatal, subsystems will use defaults
        }

        try {
            this._levelData = await LevelDataManager.loadLevel(this._levelNum);
        } catch (err) {
            warn(`[KR001SceneSetup] Failed to load level data: ${err}`);
            return;
        }

        // Verify loaded data
        log(`[KR001SceneSetup] Level data ready:`);
        log(`[KR001SceneSetup]   roadNum = ${this._levelData.roadNum}`);
        log(`[KR001SceneSetup]   posOfBuilders.length = ${this._levelData.posOfBuilders.length}`);
        log(`[KR001SceneSetup]   timeOfRound.length = ${this._levelData.timeOfRound.length}`);
        log(`[KR001SceneSetup]   stationOfSoldier.length = ${this._levelData.stationOfSoldier.length}`);

        // Initialize scene subsystems after level data is available
        this.initScene();
    }

    /**
     * Initialize scene subsystems that depend on level data being loaded.
     * Called after LevelDataManager successfully loads the level config.
     */
    private initScene(): void {
        // EnemyRoot should be a sibling of MapRoot at the same coordinate origin
        // so that road waypoint coordinates (relative to map center) correctly
        // position enemies on the map.
        if (this.enemyRoot && this.mapRoot) {
            const mapPos = this.mapRoot.getPosition();
            this.enemyRoot.setPosition(mapPos);
        }

        // Create build points from level data
        // Mirrors reference project: levelScene.buildScene() iterates posOfBuilders
        // to instantiate builder prefabs and place them at specified positions.
        this.createBuildPoints();

        log('[KR001SceneSetup] Scene subsystems initialized');
    }

    /**
     * Create build point markers at positions defined in levelData.posOfBuilders.
     * Also loads and instantiates the KR001Builder (build menu) as a single shared instance.
     * 
     * Reference: levelScene.ts buildScene()
     *   let posArr = this.levelData.posOfBuilders;
     *   for (let i = 0; i < posArr.length; i++) {
     *       let n = cc.instantiate(this.builderPrefab);
     *       this.builderMap.addChild(n);
     *       n.setPosition(posArr[i]);
     *   }
     * 
     * Uses KR001BuildPoint.prefab and KR001Builder.prefab from resources/prefabs/build/.
     */
    private createBuildPoints(): void {
        if (!this._levelData) {
            warn('[KR001SceneSetup] Cannot create build points: no level data');
            return;
        }

        const buildRoot = this.buildRoot;
        if (!buildRoot) {
            warn('[KR001SceneSetup] BuildRoot not found, cannot create build points');
            return;
        }

        const posArr = this._levelData.posOfBuilders;
        log(`[KR001SceneSetup] Creating build points... (${posArr.length} positions found in levelConfig)`);

        // Load both prefabs: build point and builder menu
        resources.load(CommonConstant.PREFAB_BUILD_POINT, Prefab, (err, buildPointPrefab) => {
            if (err) {
                warn(`[KR001SceneSetup] Failed to load KR001BuildPoint prefab: ${err.message}`);
                return;
            }

            resources.load(CommonConstant.PREFAB_BUILDER, Prefab, (err2, builderPrefab) => {
                if (err2) {
                    warn(`[KR001SceneSetup] Failed to load KR001Builder prefab: ${err2.message}`);
                    return;
                }

                // Create the single shared builder menu instance
                const builderNode = instantiate(builderPrefab);
                builderNode.name = 'KR001Builder';
                this._builder = builderNode.getComponent(KR001Builder);
                log('[KR001SceneSetup] KR001Builder instance created');

                // Create build points
                for (let i = 0; i < posArr.length; i++) {
                    const pos = posArr[i];
                    log(`[KR001SceneSetup] Build point ${i} at (${pos.x}, ${pos.y})`);

                    const buildPointNode = instantiate(buildPointPrefab);
                    buildPointNode.name = `BuildPoint_${i}`;
                    buildPointNode.setPosition(new Vec3(pos.x, pos.y, 0));

                    const buildPointComp = buildPointNode.getComponent(KR001BuildPoint);
                    if (buildPointComp) {
                        buildPointComp.init(i);
                        buildPointComp.setBuilder(this._builder!);
                    }

                    buildRoot.addChild(buildPointNode);
                }

                // Keep the build menu above every build-point land sprite.
                // Build points are added after the menu is instantiated, so adding
                // the menu last gives it the highest sibling render order and
                // prevents land sprites from covering tower buttons.
                buildRoot.addChild(builderNode);

                log(`[KR001SceneSetup] ${posArr.length} build points created successfully`);
            });
        });
    }
}
