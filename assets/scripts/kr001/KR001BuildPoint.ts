import { _decorator, Component, Node, EventTouch, log } from 'cc';
import { KR001Builder } from './KR001Builder';

const { ccclass, property } = _decorator;

/**
 * KR001BuildPoint represents a single buildable location on the map.
 *
 * Reference: kingdomRush-gxh1996 builder.ts
 * - land node has a Button component; clicking it calls outBuildFace()
 *
 * In this implementation, land uses touch events instead of Button component
 * to keep it simple and avoid needing to set up transition sprites.
 *
 * Structure:
 *   KR001BuildPoint (this component on root node)
 *   └── land (child node with Sprite showing tower_builder.png, touchable)
 */
@ccclass('KR001BuildPoint')
export class KR001BuildPoint extends Component {

    /** Index of this build point in levelData.posOfBuilders array */
    private _buildPointIndex: number = -1;

    /** Reference to the shared KR001Builder instance (set by KR001SceneSetup) */
    private _builder: KR001Builder | null = null;

    /** Reference to the land child node */
    private _land: Node | null = null;

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
     *
     * @param index - The index in posOfBuilders array (0-based)
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
     * Shows the build menu at this build point's position.
     *
     * Reference: builder.ts land Button → outBuildFace()
     */
    private onLandClicked(event: EventTouch): void {
        log(`[KR001BuildPoint] Land clicked on build point ${this._buildPointIndex}`);
        if (this._builder) {
            this._builder.show(this);
        }
        // Stop propagation so clicking land doesn't trigger other touch handlers
        event.propagationStopped = true;
    }

    /**
     * Get the build point index.
     */
    get buildPointIndex(): number {
        return this._buildPointIndex;
    }
}
