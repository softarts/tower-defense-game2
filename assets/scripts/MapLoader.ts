import {
    _decorator, Component, Node, Vec3, Sprite, SpriteFrame,
    UITransform, resources, JsonAsset, Size, log, error, warn
} from 'cc';

const { ccclass, property } = _decorator;

/** Waypoint data from JSON (image coordinate system) */
export interface WaypointData {
    x: number;
    y: number;
}

/** Build spot data from JSON (image coordinate system) */
export interface BuildSpotData {
    id: string;
    x: number;
    y: number;
}

/** Level JSON structure */
export interface LevelData {
    version: number;
    id: string;
    map: {
        width: number;
        height: number;
        background: string;
    };
    path: {
        waypoints: WaypointData[];
    };
    buildSpots: BuildSpotData[];
    enemySpawns: any[];
    castle: any;
}

@ccclass('MapLoader')
export class MapLoader extends Component {

    /** The background Sprite node (assign in Inspector or find by name) */
    @property({ type: Node, tooltip: 'Background node with Sprite component' })
    backgroundNode: Node | null = null;

    /** JSON resource path (relative to resources/) */
    @property({ tooltip: 'JSON path under resources/, without extension' })
    levelJsonPath: string = 'maps/level01';

    /** Parsed level data, available after loading completes */
    private _levelData: LevelData | null = null;

    /** Map dimensions from JSON */
    private _mapWidth: number = 0;
    private _mapHeight: number = 0;

    /** Loading complete callback for MapDebug to listen */
    public onMapLoaded: ((data: LevelData) => void) | null = null;

    get levelData(): LevelData | null {
        return this._levelData;
    }

    get mapWidth(): number {
        return this._mapWidth;
    }

    get mapHeight(): number {
        return this._mapHeight;
    }

    start() {
        this.loadLevel();
    }

    /**
     * Convert image coordinates (origin top-left, Y down) to Cocos local coordinates
     * (origin center, Y up) relative to the map center.
     */
    public imageToCocosPosition(x: number, y: number): Vec3 {
        const cocosX = x - this._mapWidth / 2;
        const cocosY = this._mapHeight / 2 - y;
        return new Vec3(cocosX, cocosY, 0);
    }

    private loadLevel() {
        log(`[MapLoader] Loading ${this.levelJsonPath}...`);

        resources.load(this.levelJsonPath, JsonAsset, (err, jsonAsset) => {
            if (err) {
                error(`[MapLoader] Failed to load ${this.levelJsonPath}: ${err.message}`);
                return;
            }

            const data = jsonAsset.json as unknown as LevelData;
            if (!this.validateLevelData(data)) {
                error('[MapLoader] Level data validation failed');
                return;
            }

            this._levelData = data;
            this._mapWidth = data.map.width;
            this._mapHeight = data.map.height;

            log(`[MapLoader] Map size: ${this._mapWidth} x ${this._mapHeight}`);
            log(`[MapLoader] Build spots: ${data.buildSpots.length}`);
            log(`[MapLoader] Path waypoints: ${data.path.waypoints.length}`);

            this.loadBackground(data.map.background);
        });
    }

    private loadBackground(backgroundId: string) {
        const resourcePath = `${backgroundId}/spriteFrame`;
        log(`[MapLoader] Loading background: ${resourcePath}`);

        resources.load(resourcePath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                error(`[MapLoader] Failed to load background SpriteFrame: ${err.message}`);
                return;
            }

            this.setupBackground(spriteFrame);
            log('[MapLoader] Background loaded successfully');
            log('[MapLoader] Map loaded successfully');

            // Notify MapDebug that data is ready
            if (this.onMapLoaded && this._levelData) {
                this.onMapLoaded(this._levelData);
            }
        });
    }

    private setupBackground(spriteFrame: SpriteFrame) {
        if (!this.backgroundNode) {
            warn('[MapLoader] Background node not assigned, searching by name...');
            this.backgroundNode = this.node.parent?.getChildByName('Background') || null;
        }

        if (!this.backgroundNode) {
            error('[MapLoader] Background node not found');
            return;
        }

        const sprite = this.backgroundNode.getComponent(Sprite);
        if (!sprite) {
            error('[MapLoader] Background node has no Sprite component');
            return;
        }

        // Assign spriteFrame
        sprite.spriteFrame = spriteFrame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        // Set content size to match map dimensions from JSON
        const uiTransform = this.backgroundNode.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(new Size(this._mapWidth, this._mapHeight));
        }

        log(`[MapLoader] Background configured: ${this._mapWidth} x ${this._mapHeight}`);
    }

    private validateLevelData(data: any): data is LevelData {
        if (!data) {
            error('[MapLoader] Level data is null');
            return false;
        }
        if (data.version !== 1) {
            error(`[MapLoader] Unsupported version: ${data.version}`);
            return false;
        }
        if (!data.map || !data.map.width || !data.map.height) {
            error('[MapLoader] Missing map dimensions');
            return false;
        }
        if (!data.map.background) {
            error('[MapLoader] Missing background reference');
            return false;
        }
        if (!data.buildSpots || !Array.isArray(data.buildSpots)) {
            error('[MapLoader] Missing or invalid buildSpots');
            return false;
        }
        if (!data.path || !data.path.waypoints || data.path.waypoints.length < 2) {
            error('[MapLoader] Path must have at least 2 waypoints');
            return false;
        }

        // Validate build spot uniqueness and bounds
        const ids = new Set<string>();
        for (const spot of data.buildSpots) {
            if (!spot.id || typeof spot.x !== 'number' || typeof spot.y !== 'number') {
                error(`[MapLoader] BuildSpot has invalid data: ${JSON.stringify(spot)}`);
                return false;
            }
            if (ids.has(spot.id)) {
                error(`[MapLoader] Duplicate BuildSpot ID: ${spot.id}`);
                return false;
            }
            ids.add(spot.id);
            if (spot.x < 0 || spot.x > data.map.width || spot.y < 0 || spot.y > data.map.height) {
                warn(`[MapLoader] BuildSpot "${spot.id}" coordinates out of map bounds`);
            }
        }

        // Validate waypoints bounds
        for (let i = 0; i < data.path.waypoints.length; i++) {
            const wp = data.path.waypoints[i];
            if (typeof wp.x !== 'number' || typeof wp.y !== 'number') {
                error(`[MapLoader] Waypoint[${i}] has invalid coordinates`);
                return false;
            }
            if (wp.x < 0 || wp.x > data.map.width || wp.y < 0 || wp.y > data.map.height) {
                warn(`[MapLoader] Waypoint[${i}] coordinates out of map bounds: (${wp.x}, ${wp.y})`);
            }
        }

        log(`[MapLoader] Validation passed: ${data.buildSpots.length} build spots, ${data.path.waypoints.length} waypoints`);
        return true;
    }
}
