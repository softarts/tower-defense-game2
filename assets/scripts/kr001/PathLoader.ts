import { Vec2, resources, JsonAsset, log, error } from 'cc';
import { CommonConstant } from './CommonConstant';

/**
 * Road path data structure matching road1.json format.
 */
export interface RoadData {
    name: string;
    sampleDistance: number;
    coordinateSystem: string;
    points: { x: number; y: number }[];
}

/**
 * PathLoader loads pre-sampled road waypoints from JSON.
 * 
 * The road JSON files are generated from roadData.anim bezier curves
 * using tools/convert-road-data.js. Coordinates are in Cocos node-local
 * space (origin center, Y up).
 * 
 * Usage:
 *   const path = await PathLoader.load('road1');
 *   // path is Vec2[] ready for enemy movement
 */
export class PathLoader {

    /**
     * Load a road path from resources.
     * @param roadName - Road identifier (e.g., 'road1', 'road2', 'road3')
     * @returns Promise resolving to Vec2[] waypoints in node-local coordinates
     */
    static load(roadName: string): Promise<Vec2[]> {
        return new Promise((resolve, reject) => {
            const resourcePath = CommonConstant.roadData(1, roadName);
            log(`[PathLoader] Loading path: ${resourcePath}`);

            resources.load(resourcePath, JsonAsset, (err, jsonAsset) => {
                if (err) {
                    error(`[PathLoader] Failed to load ${resourcePath}: ${err.message}`);
                    reject(err);
                    return;
                }

                const data = jsonAsset.json as unknown as RoadData;
                if (!data || !data.points || data.points.length < 2) {
                    const msg = `[PathLoader] Invalid road data in ${resourcePath}`;
                    error(msg);
                    reject(new Error(msg));
                    return;
                }

                const waypoints: Vec2[] = data.points.map(p => new Vec2(p.x, p.y));
                log(`[PathLoader] Loaded ${waypoints.length} waypoints for ${data.name}`);
                resolve(waypoints);
            });
        });
    }
}
