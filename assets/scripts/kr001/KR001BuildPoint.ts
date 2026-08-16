import { _decorator, Component, Node, EventTouch, Prefab, instantiate, resources, UIOpacity, Vec3, log, warn } from 'cc';
import { KR001Builder } from './KR001Builder';
import { CommonConstant } from './CommonConstant';
import { KR001ArrowTower } from './arrowtower/KR001ArrowTower';
import { KR001MagiclanTower } from './KR001MagiclanTower';
import { KR001ArtilleryTower } from './KR001ArtilleryTower';

const { ccclass, property } = _decorator;

/**
 * KR001BuildPoint represents a single buildable location on the map.
 *
 * Reference: kingdomRush-gxh1996 builder.ts
 * - land node is clickable; clicking opens build menu
 * - buildTower(): instantiate prefab → addChild to towerMap → setPosition → land.opacity=0 → hideMenu
 *
 * Lifecycle:
 *   1. Click land → show KR001Builder menu
 *   2. Select tower type → onBuildSelected(type)
 *   3. Load tower prefab → instantiate → position at this node → hide land
 *   4. Mark as built (no more menu on re-click)
 */
@ccclass('KR001BuildPoint')
export class KR001BuildPoint extends Component {

    /** Index of this build point in levelData.posOfBuilders array */
    private _buildPointIndex: number = -1;

    /** Reference to the shared KR001Builder instance (set by KR001SceneSetup) */
    private _builder: KR001Builder | null = null;

    /** Reference to the land child node */
    private _land: Node | null = null;

    /** Whether a tower has been built on this point */
    private _isBuilt: boolean = false;

    /** The tower node that was built here (if any) */
    private _tower: Node | null = null;

    onLoad(): void {
        this._land = this.node.getChildByName('land');
        if (this._land) {
            this._land.on(Node.EventType.TOUCH_END, this.onLandClicked, this);
        }
    }

    onDestroy(): void {
        if (this._land) {
            this._land.off(Node.EventType.TOUCH_END, this.onLandClicked, this);
        }
    }

    /**
     * Initialize this build point with its index.
     * Called by KR001SceneSetup after instantiation.
     */
    init(index: number): void {
        this._buildPointIndex = index;
        log(`[KR001BuildPoint] Initialized build point ${index}`);
    }

    /**
     * Set the shared KR001Builder instance reference.
     * Called by KR001SceneSetup after creating the builder.
     */
    setBuilder(builder: KR001Builder): void {
        this._builder = builder;
    }

    /**
     * Handle touch on the land node.
     * Shows the build menu if not already built.
     *
     * Reference: builder.ts land Button → outBuildFace()
     */
    private onLandClicked(event: EventTouch): void {
        // Don't open menu if already built
        if (this._isBuilt) {
            log(`[KR001BuildPoint] Build point ${this._buildPointIndex} already has a tower`);
            return;
        }

        log(`[KR001BuildPoint] Land clicked on build point ${this._buildPointIndex}`);
        if (this._builder) {
            this._builder.show(this);
        }
        event.propagationStopped = true;
    }

    /**
     * Called by KR001Builder when the player selects a tower type.
     * Loads the corresponding prefab and instantiates it at this position.
     *
     * Reference: builder.ts buildTower(towerPrefab, component, cost)
     *   - instantiate(towerPrefab)
     *   - towerMap.addChild(tower.node)
     *   - tower.node.setPosition(this.node.getPosition())
     *   - this.land.opacity = 0
     */
    onBuildSelected(buildType: string): void {
        if (this._isBuilt) {
            warn(`[KR001BuildPoint] Already built at point ${this._buildPointIndex}`);
            return;
        }

        const prefabPath = CommonConstant.TOWER_PREFAB_MAP[buildType];
        if (!prefabPath) {
            warn(`[KR001BuildPoint] Unknown build type: ${buildType}`);
            return;
        }

        log(`[KR001BuildPoint] Building ${buildType} at point ${this._buildPointIndex}`);

        resources.load(prefabPath, Prefab, (err, prefab) => {
            if (err) {
                warn(`[KR001BuildPoint] Failed to load tower prefab '${prefabPath}': ${err.message}`);
                return;
            }

            // Instantiate tower
            const towerNode = instantiate(prefab);
            towerNode.name = `Tower_${buildType}_${this._buildPointIndex}`;

            // Add tower as sibling of this build point (same parent = BuildRoot)
            // so coordinate systems match directly.
            const parent = this.node.parent;
            if (parent) {
                parent.addChild(towerNode);
                // Use same local position as this build point
                towerNode.setPosition(this.node.getPosition());
            }

            this._tower = towerNode;
            this._isBuilt = true;

            // Hide the land sprite (reference: this.land.opacity = 0)
            this.hideLand();

            // Attach tower attack script based on type
            this.attachTowerScript(towerNode, buildType);

            log(`[KR001BuildPoint] Tower '${buildType}' built at point ${this._buildPointIndex}`);

            // Barrack spawns soldiers after building
            if (buildType === 'barrack') {
                this.spawnSoldiers();
            }
        });
    }

    /**
     * Attach the corresponding attack script to the tower node.
     * Each tower type has its own controller that handles update() → detect → shoot.
     *
     * Reference: arrowTower.ts / magiclanTower.ts / artilleryTower.ts
     */
    private attachTowerScript(towerNode: Node, buildType: string): void {
        switch (buildType) {
            case 'arrow':
                towerNode.addComponent(KR001ArrowTower);
                break;
            case 'magiclan':
                towerNode.addComponent(KR001MagiclanTower);
                break;
            case 'artillery':
                towerNode.addComponent(KR001ArtilleryTower);
                break;
            // barrack doesn't shoot
        }
    }

    /**
     * Spawn soldiers around the barrack.
     * Reference: barrack.ts spawns soldiers at outSoldierPos(2,-16) then moves them to stationOfSoldier positions.
     * For now, soldiers are placed in a spread pattern near the barrack.
     */
    private spawnSoldiers(): void {
        resources.load(CommonConstant.PREFAB_SOLDIER, Prefab, (err, soldierPrefab) => {
            if (err) {
                warn(`[KR001BuildPoint] Failed to load soldier prefab: ${err.message}`);
                return;
            }

            const parent = this.node.parent;
            if (!parent) return;

            const basePos = this.node.getPosition();
            const offsetX = CommonConstant.BARRACK_SOLDIER_OFFSET_X;
            const offsetY = CommonConstant.BARRACK_SOLDIER_OFFSET_Y;
            const spread = CommonConstant.SOLDIER_SPREAD;

            for (let i = 0; i < CommonConstant.BARRACK_SOLDIER_COUNT; i++) {
                const soldier = instantiate(soldierPrefab);
                soldier.name = `Soldier_${this._buildPointIndex}_${i}`;

                // Spread soldiers in a line below the barrack
                const sx = basePos.x + offsetX + (i - 1.5) * spread;
                const sy = basePos.y + offsetY;
                soldier.setPosition(new Vec3(sx, sy, 0));

                parent.addChild(soldier);
            }

            log(`[KR001BuildPoint] ${CommonConstant.BARRACK_SOLDIER_COUNT} soldiers spawned at build point ${this._buildPointIndex}`);
        });
    }

    /**
     * Hide the land marker after building.
     * Reference: builder.ts → this.land.opacity = 0
     */
    private hideLand(): void {
        if (!this._land) return;

        // Use UIOpacity if available, otherwise set active to false
        let opacityComp = this._land.getComponent(UIOpacity);
        if (!opacityComp) {
            opacityComp = this._land.addComponent(UIOpacity);
        }
        opacityComp.opacity = 0;
    }

    get buildPointIndex(): number {
        return this._buildPointIndex;
    }

    get isBuilt(): boolean {
        return this._isBuilt;
    }
}
