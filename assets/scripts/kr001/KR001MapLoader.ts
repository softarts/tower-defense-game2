import {
    _decorator, Component, Sprite, SpriteFrame, UITransform, Size,
    resources, log, error
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * KR001MapLoader loads the Level 1 map background image.
 * 
 * Attach this to the LevelMap node. It loads map1.png from resources
 * and sets up the Sprite with correct sizing.
 * 
 * The map image defines the coordinate space for road paths.
 * Road waypoint coordinates are relative to the map center (origin center, Y up).
 */
@ccclass('KR001MapLoader')
export class KR001MapLoader extends Component {

    @property({ tooltip: 'Map image resource path (without extension, relative to resources/)' })
    mapPath: string = 'level1/map1/spriteFrame';

    /** Map dimensions (will be set from loaded image) */
    private _mapWidth: number = 0;
    private _mapHeight: number = 0;

    get mapWidth(): number { return this._mapWidth; }
    get mapHeight(): number { return this._mapHeight; }

    start(): void {
        this.loadMap();
    }

    private loadMap(): void {
        log(`[KR001MapLoader] Loading map: ${this.mapPath}`);

        resources.load(this.mapPath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                error(`[KR001MapLoader] Failed to load map: ${err.message}`);
                return;
            }

            this.setupMap(spriteFrame);
        });
    }

    private setupMap(spriteFrame: SpriteFrame): void {
        const sprite = this.getComponent(Sprite);
        if (!sprite) {
            error('[KR001MapLoader] No Sprite component on this node');
            return;
        }

        sprite.spriteFrame = spriteFrame;
        sprite.sizeMode = Sprite.SizeMode.RAW;

        // Get actual image dimensions
        const texture = spriteFrame.texture;
        this._mapWidth = texture.width;
        this._mapHeight = texture.height;

        // Set UITransform to match image size
        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(new Size(this._mapWidth, this._mapHeight));
        }

        log(`[KR001MapLoader] Map loaded: ${this._mapWidth} x ${this._mapHeight}`);
    }
}
