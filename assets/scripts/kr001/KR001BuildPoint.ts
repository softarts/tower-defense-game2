import { _decorator, Component, log } from 'cc';

const { ccclass, property } = _decorator;

/**
 * KR001BuildPoint represents a single buildable location on the map.
 *
 * Reference: kingdomRush-gxh1996 builder.ts
 * - The reference project's Builder manages land visibility, build menu, and tower creation.
 * - This script currently only handles displaying the empty land marker.
 * - Future tasks will add click handling, build menu, and tower construction.
 *
 * Structure:
 *   KR001BuildPoint (this component on root node)
 *   └── land (child node with Sprite showing tower_builder.png)
 */
@ccclass('KR001BuildPoint')
export class KR001BuildPoint extends Component {

    /** Index of this build point in levelData.posOfBuilders array */
    private _buildPointIndex: number = -1;

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
     * Get the build point index.
     */
    get buildPointIndex(): number {
        return this._buildPointIndex;
    }
}
