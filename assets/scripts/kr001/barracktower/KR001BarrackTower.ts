import { _decorator, Component, Node, Vec3, Prefab, instantiate, resources, find, log } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { KR001Soldier } from './KR001Soldier';

const { ccclass, property } = _decorator;

/**
 * KR001BarrackTower manages the barrack tower — soldier lifecycle.
 *
 * Reference: kingdomRush-gxh1996 barrack.ts
 * - update() → autoOutSoldier(): if soldiers < max, spawn after cooldown
 * - createSoldier(): instantiate from pool, init at outSoldierPos, assign station
 * - releaseSoldier(soldier): return station number, put node back to pool
 * - destroySelf(): cleanup all soldiers + pool
 *
 * Architecture (mirrors reference):
 *   barrack.ts → manages soldier count, pool, cooldown, station assignment
 *   soldier.ts → individual AI: idle → track → attack → die
 */
@ccclass('KR001BarrackTower')
export class KR001BarrackTower extends Component {

    private _maxSoldiers: number = CommonConstant.BARRACK_MAX_SOLDIERS;
    private _spawnCooldown: number = CommonConstant.BARRACK_SPAWN_COOLDOWN;

    /** Available station indices (soldiers return here when not fighting) */
    private _availableStations: number[] = [];

    /** Station world positions (set by KR001BuildPoint from levelConfig) */
    private _stationPositions: Vec3[] = [];

    /** Currently active soldiers */
    private _activeSoldiers: KR001Soldier[] = [];

    /** Whether we can spawn a new soldier (cooldown control) */
    private _canSpawn: boolean = true;

    /** Soldier prefab (loaded once) */
    private _soldierPrefab: Prefab | null = null;

    /** Enemy root for soldiers to find targets */
    private _enemyRoot: Node | null = null;

    onLoad(): void {
        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        resources.load(CommonConstant.PREFAB_SOLDIER, Prefab, (err, prefab) => {
            if (err) {
                log(`[KR001BarrackTower] Failed to load soldier prefab: ${err.message}`);
                return;
            }
            this._soldierPrefab = prefab;
        });
    }

    /**
     * Initialize with station positions.
     * Called by KR001BuildPoint after tower creation.
     *
     * @param stationPositions Array of world positions for soldier stations.
     *   If not provided, generates default positions below the barrack.
     */
    initStations(stationPositions?: Vec3[]): void {
        if (stationPositions && stationPositions.length > 0) {
            this._stationPositions = stationPositions;
        } else {
            // Generate default station positions below the barrack
            // Reference: barrack.ts uses stationOfSoldier from levelConfig
            const basePos = this.node.getWorldPosition();
            const spread = CommonConstant.SOLDIER_SPREAD;
            for (let i = 0; i < this._maxSoldiers; i++) {
                this._stationPositions.push(new Vec3(
                    basePos.x + (i - 1) * spread,
                    basePos.y + CommonConstant.BARRACK_SOLDIER_OFFSET_Y,
                    0
                ));
            }
        }

        // All stations initially available
        this._availableStations = [];
        for (let i = 0; i < this._maxSoldiers; i++) {
            this._availableStations.push(i);
        }

        // Spawn all soldiers immediately on barrack creation (no delay).
        // Reference: barrack.ts creates soldier pool immediately, soldiers
        // appear at outSoldierPos right away (no initial cooldown).
        // We wait one frame for soldierPrefab to be loaded, then batch-spawn.
        this.scheduleOnce(() => {
            const count = this._maxSoldiers;
            for (let i = 0; i < count; i++) {
                if (this._soldierPrefab) {
                    this.spawnSoldier();
                }
            }
        }, 0.1);
    }

    /**
     * Auto-spawn soldiers when below max count.
     *
     * Reference: barrack.ts update() → autoOutSoldier()
     * - If creSoldEnable && createdSoldiers.length < maxNumOfSoldier
     * - scheduleOnce(outSoldier, tOfCreateSoldier)
     */
    update(dt: number): void {
        if (!this._soldierPrefab) return;

        if (this._canSpawn &&
            this._activeSoldiers.length < this._maxSoldiers &&
            this._availableStations.length > 0) {
            this._canSpawn = false;
            this.scheduleOnce(() => {
                this.spawnSoldier();
                this._canSpawn = true;
            }, this._spawnCooldown);
        }
    }

    /**
     * Spawn a single soldier at the barrack's outSoldierPos, then it walks to station.
     *
     * Reference: barrack.ts outSoldier() → createSoldier()
     */
    private spawnSoldier(): void {
        if (!this._soldierPrefab || this._availableStations.length === 0) return;

        const soldierNode = instantiate(this._soldierPrefab);
        soldierNode.name = `Soldier_${this.node.name}`;

        // Add to the same parent as the tower (BuildRoot)
        const parent = this.node.parent;
        if (!parent) return;
        parent.addChild(soldierNode);

        // Set initial position at barrack's outSoldierPos
        // Reference: barrack.ts outPos = this.node.convertToWorldSpaceAR(this.outSoldierPos)
        const barrackPos = this.node.getWorldPosition();
        const outPos = new Vec3(
            barrackPos.x + CommonConstant.BARRACK_SOLDIER_OFFSET_X,
            barrackPos.y + CommonConstant.BARRACK_SOLDIER_OFFSET_Y,
            0
        );
        soldierNode.setWorldPosition(outPos);

        // Assign station
        const stationIndex = this._availableStations.pop()!;
        const stationPos = this._stationPositions[stationIndex];

        // Add and initialize soldier component
        const soldier = soldierNode.addComponent(KR001Soldier);
        soldier.init(stationIndex, stationPos, this, this._enemyRoot);

        this._activeSoldiers.push(soldier);

        log(`[KR001BarrackTower] Soldier spawned, station ${stationIndex}, active: ${this._activeSoldiers.length}`);
    }

    /**
     * Called by KR001Soldier when it dies — return station and remove from active list.
     *
     * Reference: barrack.ts releaseSoldier(soldier)
     * - availableStationNo.push(soldier.stationNo)
     * - Utils.removeItemOfArray(createdSoldiers, soldier)
     * - soldierPool.put(soldier.node)
     */
    releaseSoldier(soldier: KR001Soldier): void {
        this._availableStations.push(soldier.stationNo);

        const idx = this._activeSoldiers.indexOf(soldier);
        if (idx >= 0) {
            this._activeSoldiers.splice(idx, 1);
        }

        // Destroy the soldier node (simplified — no pool for now)
        if (soldier.node && soldier.node.isValid) {
            soldier.node.destroy();
        }

        log(`[KR001BarrackTower] Soldier released, station ${soldier.stationNo}, active: ${this._activeSoldiers.length}`);
    }

    onDestroy(): void {
        // Clean up all active soldiers
        // Reference: barrack.ts destroySelf()
        for (const soldier of this._activeSoldiers) {
            if (soldier.node && soldier.node.isValid) {
                soldier.node.destroy();
            }
        }
        this._activeSoldiers.length = 0;
    }
}
