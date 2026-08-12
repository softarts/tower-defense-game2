import { resources, JsonAsset, log, warn } from 'cc';

/**
 * LevelData describes the configuration for a single level.
 */
export interface LevelData {
    /** Description of the level config */
    dirction: string;
    /** Number of enemy roads */
    roadNum: number;
    /** Builder placement positions (node-local coordinates) */
    posOfBuilders: { x: number; y: number }[];
    /** Enemy types per round per road: noOfRound[roundIndex][roadIndex] */
    noOfRound: number[][];
    /** Time delay before each round starts (seconds) */
    timeOfRound: number[];
    /** Soldier station positions grouped by builder: stationOfSoldier[builderIndex][soldierSlot] */
    stationOfSoldier: { x: number; y: number }[][];
}

/**
 * LevelDataManager is responsible for loading and caching per-level configuration data.
 *
 * Design reference: kingdomRush-gxh1996 levelDataManager.ts
 * - The reference project pre-loads all levels into a static array at game start.
 * - This project loads levels on-demand from resources/level{N}/levelConfig.json
 *   because each level has its own directory under resources/.
 *
 * Usage:
 *   await LevelDataManager.loadLevel(1);
 *   const data = LevelDataManager.getLevelData();
 */
export class LevelDataManager {

    /** Currently loaded level data */
    private static _currentLevelData: LevelData | null = null;

    /** Currently loaded level number */
    private static _currentLevelNum: number = 0;

    /**
     * Load a level's configuration from resources.
     * Path convention: resources/level{levelNum}/levelConfig.json
     *
     * @param levelNum - The level number to load (1-based)
     * @returns Promise that resolves with the parsed LevelData
     */
    static loadLevel(levelNum: number): Promise<LevelData> {
        const path = `level${levelNum}/levelConfig`;

        return new Promise<LevelData>((resolve, reject) => {
            resources.load(path, JsonAsset, (err, jsonAsset) => {
                if (err) {
                    warn(`[LevelDataManager] Failed to load level ${levelNum}: ${err.message}`);
                    reject(err);
                    return;
                }

                const json = jsonAsset.json as any;
                if (!json) {
                    const msg = `[LevelDataManager] Level ${levelNum} config is empty`;
                    warn(msg);
                    reject(new Error(msg));
                    return;
                }

                const levelData: LevelData = {
                    dirction: json.dirction ?? '',
                    roadNum: json.roadNum,
                    posOfBuilders: json.posOfBuilders,
                    noOfRound: json.noOfRound,
                    timeOfRound: json.timeOfRound,
                    stationOfSoldier: json.stationOfSoldier,
                };

                LevelDataManager._currentLevelData = levelData;
                LevelDataManager._currentLevelNum = levelNum;

                log(`[LevelDataManager] Level ${levelNum} loaded`);
                log(`[LevelDataManager]   roadNum: ${levelData.roadNum}`);
                log(`[LevelDataManager]   posOfBuilders count: ${levelData.posOfBuilders.length}`);
                log(`[LevelDataManager]   rounds: ${levelData.noOfRound.length}`);
                log(`[LevelDataManager]   timeOfRound count: ${levelData.timeOfRound.length}`);
                log(`[LevelDataManager]   stationOfSoldier groups: ${levelData.stationOfSoldier.length}`);

                resolve(levelData);
            });
        });
    }

    /**
     * Get the currently loaded LevelData.
     * Must call loadLevel() first.
     */
    static getLevelData(): LevelData {
        if (!LevelDataManager._currentLevelData) {
            throw new Error('[LevelDataManager] No level data loaded. Call loadLevel() first.');
        }
        return LevelDataManager._currentLevelData;
    }

    /**
     * Get the currently loaded level number.
     */
    static getCurrentLevelNum(): number {
        return LevelDataManager._currentLevelNum;
    }

    /**
     * Check whether level data has been loaded.
     */
    static isLoaded(): boolean {
        return LevelDataManager._currentLevelData !== null;
    }
}
