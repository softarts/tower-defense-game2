import {
    _decorator, Component, Vec2, log, error
} from 'cc';
import { PathLoader } from './PathLoader';
import { KR001EnemyController } from './KR001EnemyController';
import { EnemyFactory } from './EnemyFactory';

const { ccclass, property } = _decorator;

/**
 * KR001EnemySpawner spawns enemies at intervals along road1.
 * 
 * Attach this to EnemyRoot node in KR001.scene.
 * It loads road1 path data and the KR001Enemy prefab,
 * then periodically instantiates enemies and initializes their movement.
 */
@ccclass('KR001EnemySpawner')
export class KR001EnemySpawner extends Component {

    @property({ tooltip: 'Road name to load (e.g., road1)' })
    roadName: string = 'road1';

    @property({ tooltip: 'Seconds between enemy spawns' })
    spawnInterval: number = 2.0;

    @property({ tooltip: 'Enemy movement speed (units/second)' })
    enemySpeed: number = 80;

    @property({ tooltip: 'Maximum enemies to spawn (0 = unlimited)' })
    maxEnemies: number = 10;

    /** Loaded path waypoints */
    private _path: Vec2[] = [];

    /** Spawn state */
    private _timer: number = 0;
    private _spawnedCount: number = 0;
    private _isReady: boolean = false;
    private _activeEnemies: number = 0;

    async start() {
        try {
            // Load path and prefab in parallel
            const [path] = await Promise.all([
                PathLoader.load(this.roadName),
                EnemyFactory.preload()
            ]);
            this._path = path;
            this._isReady = true;
            this._timer = this.spawnInterval; // Spawn first enemy immediately
            log(`[KR001EnemySpawner] Ready. Path: ${this._path.length} waypoints, speed: ${this.enemySpeed}, interval: ${this.spawnInterval}s`);
        } catch (e) {
            error(`[KR001EnemySpawner] Failed to initialize: ${e}`);
        }
    }

    update(dt: number): void {
        if (!this._isReady) return;
        if (this.maxEnemies > 0 && this._spawnedCount >= this.maxEnemies) return;

        this._timer += dt;
        if (this._timer >= this.spawnInterval) {
            this._timer = 0;
            this.spawnEnemy();
        }
    }

    private spawnEnemy(): void {
        if (this._path.length < 2) {
            error('[KR001EnemySpawner] Path has insufficient waypoints');
            return;
        }

        const enemyNode = EnemyFactory.createEnemy();
        if (!enemyNode) {
            error('[KR001EnemySpawner] EnemyFactory.createEnemy() returned null');
            return;
        }

        this._spawnedCount++;
        this._activeEnemies++;

        enemyNode.name = `Enemy_${this._spawnedCount}`;
        enemyNode.setParent(this.node);

        // Get or add KR001EnemyController
        let controller = enemyNode.getComponent(KR001EnemyController);
        if (!controller) {
            controller = enemyNode.addComponent(KR001EnemyController);
        }

        controller.init(this._path, this.enemySpeed);
        controller.onReachedExit = () => {
            this._activeEnemies--;
            log(`[KR001EnemySpawner] Enemy exited. Active: ${this._activeEnemies}`);
        };

        log(`[KR001EnemySpawner] Spawned #${this._spawnedCount}. Active: ${this._activeEnemies}`);
    }

    /** Get current number of active enemies */
    public get activeEnemyCount(): number {
        return this._activeEnemies;
    }

    /** Get total spawned count */
    public get totalSpawned(): number {
        return this._spawnedCount;
    }
}
