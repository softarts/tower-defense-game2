import { Node, Prefab, instantiate, resources, log, error } from 'cc';
import { CommonConstant } from './CommonConstant';

/**
 * EnemyFactory loads enemy prefabs (KR001Enemy, monster1, etc.) and instantiates enemies.
 * 
 * Supports both monster0 (default) and monster1.
 */
export class EnemyFactory {

    private static _prefabs: Map<string, Prefab> = new Map();
    private static _loadPromise: Promise<void> | null = null;

    /**
     * Preload the enemy prefabs. Call once before spawning.
     */
    static preload(): Promise<void> {
        if (EnemyFactory._prefabs.size > 0) {
            return Promise.resolve();
        }
        if (EnemyFactory._loadPromise) {
            return EnemyFactory._loadPromise;
        }

        log('[EnemyFactory] Loading enemy prefabs...');

        EnemyFactory._loadPromise = new Promise<void>((resolve, reject) => {
            resources.load(CommonConstant.PREFAB_ENEMY_0, Prefab, (err, prefab0) => {
                if (err) {
                    error(`[EnemyFactory] Failed to load prefab0: ${err.message}`);
                    EnemyFactory._loadPromise = null;
                    reject(err);
                    return;
                }

                EnemyFactory._prefabs.set(CommonConstant.PREFAB_ENEMY_0, prefab0);
                log('[EnemyFactory] KR001Enemy (monster0) prefab loaded');

                // Attempt to load monster1 prefab
                resources.load(CommonConstant.PREFAB_ENEMY_1, Prefab, (err1, prefab1) => {
                    if (!err1 && prefab1) {
                        EnemyFactory._prefabs.set(CommonConstant.PREFAB_ENEMY_1, prefab1);
                        log('[EnemyFactory] monster1 prefab loaded');
                    } else {
                        log('[EnemyFactory] monster1 prefab optional load info: ' + (err1?.message || 'fallback to default'));
                    }
                    resolve();
                });
            });
        });

        return EnemyFactory._loadPromise;
    }

    /**
     * Instantiate a new enemy from the prefab.
     * @param type Prefab resource path (defaults to PREFAB_ENEMY_0)
     */
    static createEnemy(type: string = CommonConstant.PREFAB_ENEMY_0): Node | null {
        let prefab = EnemyFactory._prefabs.get(type);
        if (!prefab) {
            prefab = EnemyFactory._prefabs.get(CommonConstant.PREFAB_ENEMY_0);
        }
        if (!prefab) {
            error('[EnemyFactory] Prefab not loaded. Call preload() first.');
            return null;
        }

        const node = instantiate(prefab);
        return node;
    }
}
