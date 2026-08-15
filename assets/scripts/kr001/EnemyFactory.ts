import { Node, Prefab, instantiate, resources, log, error } from 'cc';
import { CommonConstant } from './CommonConstant';

/**
 * EnemyFactory loads KR001Enemy.prefab and instantiates enemies.
 * 
 * The prefab already contains:
 * - KR001Enemy (root node)
 *   └── Visual (Sprite with actor0_0 SpriteFrame)
 * 
 * EnemyFactory does NOT:
 * - Scan for walk sprite frames
 * - Create Sprite components
 * - Manage animation frames
 */
export class EnemyFactory {

    private static _prefab: Prefab | null = null;
    private static _loadPromise: Promise<void> | null = null;

    /**
     * Preload the enemy prefab. Call once before spawning.
     */
    static preload(): Promise<void> {
        if (EnemyFactory._prefab) {
            return Promise.resolve();
        }
        if (EnemyFactory._loadPromise) {
            return EnemyFactory._loadPromise;
        }

        log('[EnemyFactory] Loading KR001Enemy prefab...');

        EnemyFactory._loadPromise = new Promise<void>((resolve, reject) => {
            resources.load(CommonConstant.PREFAB_ENEMY, Prefab, (err, prefab) => {
                if (err) {
                    error(`[EnemyFactory] Failed to load prefab: ${err.message}`);
                    EnemyFactory._loadPromise = null;
                    reject(err);
                    return;
                }

                EnemyFactory._prefab = prefab;
                log('[EnemyFactory] KR001Enemy prefab loaded');
                resolve();
            });
        });

        return EnemyFactory._loadPromise;
    }

    /**
     * Instantiate a new enemy from the prefab.
     * Must call preload() first.
     */
    static createEnemy(): Node | null {
        if (!EnemyFactory._prefab) {
            error('[EnemyFactory] Prefab not loaded. Call preload() first.');
            return null;
        }

        const node = instantiate(EnemyFactory._prefab);
        return node;
    }
}
