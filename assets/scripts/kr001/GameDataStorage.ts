import { resources, JsonAsset, log, warn } from 'cc';
import { CommonConstant } from './CommonConstant';

/**
 * GameConfig wraps the gameConfig.json data and provides typed access.
 *
 * Reference: kingdomRush-gxh1996 gameDataManager.ts → GameConfig class
 * - getMonsterData(): returns mosterData array
 * - getDataOfArrowTower/Artillery/Barrack/Magiclan
 * - getSoldierData
 */
export class GameConfig {
    private _config: any;

    constructor(config: any) {
        this._config = config;
        log('[GameConfig] Initialized with config data');
    }

    getMonsterData(): any[] {
        return this._config.monsterData || [];
    }

    getDataOfArrowTower(): any[] {
        return this._config.dataOfTower?.arrowTower || [];
    }

    getDataOfArtillery(): any[] {
        return this._config.dataOfTower?.artillery || [];
    }

    getDataOfBarrack(): any[] {
        return this._config.dataOfTower?.barrack || [];
    }

    getDataOfMagiclan(): any[] {
        return this._config.dataOfTower?.magiclan || [];
    }

    getSoldierData(): any[] {
        return this._config.soldierData || [];
    }

    getInitChip(): number {
        return this._config.initChip ?? 200;
    }

    getInitBlood(): number {
        return this._config.initBlood ?? 4;
    }

    getRateOfSale(): number {
        return this._config.rateOfSale ?? 0.7;
    }
}

/**
 * GameDataStorage is the global singleton that loads and holds game configuration.
 *
 * Reference: kingdomRush-gxh1996 gameDataManager.ts → GameDataStorage class
 * - Static class, no instantiation needed
 * - init(gameConfig) must be called once at game start
 * - getGameConfig() returns the GameConfig instance
 *
 * Usage:
 *   await GameDataStorage.load();           // call once in KR001SceneSetup
 *   const config = GameDataStorage.getGameConfig();
 *   const monsterSpeed = config.getMonsterData()[0].speedOfMove;
 */
export class GameDataStorage {

    private static _gameConfig: GameConfig | null = null;
    private static _loadPromise: Promise<void> | null = null;

    /**
     * Load gameConfig.json from resources.
     * Can be called multiple times safely (only loads once).
     *
     * Reference: GameDataStorage.init(gameConfig) in the reference project
     * is called during game start scene. We do the same but async.
     */
    static load(): Promise<void> {
        if (GameDataStorage._gameConfig) {
            return Promise.resolve();
        }
        if (GameDataStorage._loadPromise) {
            return GameDataStorage._loadPromise;
        }

        GameDataStorage._loadPromise = new Promise<void>((resolve, reject) => {
            resources.load(CommonConstant.GAME_CONFIG, JsonAsset, (err, jsonAsset) => {
                if (err) {
                    warn(`[GameDataStorage] Failed to load gameConfig: ${err.message}`);
                    reject(err);
                    return;
                }

                const json = jsonAsset.json as any;
                if (!json) {
                    warn('[GameDataStorage] gameConfig.json is empty');
                    reject(new Error('Empty gameConfig'));
                    return;
                }

                GameDataStorage._gameConfig = new GameConfig(json);
                log('[GameDataStorage] gameConfig loaded successfully');
                resolve();
            });
        });

        return GameDataStorage._loadPromise;
    }

    /**
     * Get the loaded GameConfig instance.
     * Must call load() first.
     *
     * Reference: GameDataStorage.getGameConfig()
     */
    static getGameConfig(): GameConfig {
        if (!GameDataStorage._gameConfig) {
            throw new Error('[GameDataStorage] Not loaded. Call GameDataStorage.load() first.');
        }
        return GameDataStorage._gameConfig;
    }

    /**
     * Check if config has been loaded.
     */
    static isLoaded(): boolean {
        return GameDataStorage._gameConfig !== null;
    }
}
