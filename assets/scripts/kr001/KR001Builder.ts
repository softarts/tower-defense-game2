import { _decorator, Component, Node, log, tween, Vec3 } from 'cc';
import { KR001BuildPoint } from './KR001BuildPoint';

const { ccclass, property } = _decorator;

/**
 * KR001Builder manages the circular build menu that appears when clicking a build point.
 *
 * Reference: kingdomRush-gxh1996 builder.ts
 * - outBuildFace(): shows the menu with scale animation
 * - hiddenBuildFace(): hides with scale-down animation
 *
 * This is a single-instance component placed on a node in the scene.
 * When a build point is clicked, show() is called to display the menu
 * at that build point's position.
 *
 * Structure (prefab):
 *   KR001Builder (this component)
 *   └── buildFace (initially inactive)
 *       ├── bg (circular ring sprite, scale 0.4)
 *       └── g1 (container for 4 tower buttons)
 *           ├── arrow (left)
 *           ├── barrack (top)
 *           ├── magiclan (right)
 *           └── artillery (bottom)
 */
@ccclass('KR001Builder')
export class KR001Builder extends Component {

    /** The build menu face node (contains bg + g1) */
    private _buildFace: Node | null = null;

    /** The g1 group containing tower selection buttons */
    private _g1: Node | null = null;

    /** Currently associated build point */
    private _currentBuildPoint: KR001BuildPoint | null = null;

    /** Whether the menu is currently showing */
    private _isShowing: boolean = false;

    /** Animation duration for show/hide (seconds) */
    private readonly ANIM_DURATION: number = 0.15;

    onLoad(): void {
        this._buildFace = this.node.getChildByName('buildFace');
        if (this._buildFace) {
            this._g1 = this._buildFace.getChildByName('g1');
        }

        // Start hidden
        this.hide();
    }

    /**
     * Show the build menu at the specified build point.
     * If already showing at a different point, moves to the new one.
     *
     * Reference: builder.ts outBuildFace()
     *   - buildFace.active = true
     *   - g1.active = true
     *   - scale animation from 0 to 1
     */
    show(buildPoint: KR001BuildPoint): void {
        if (!this._buildFace || !this._g1) {
            log('[KR001Builder] buildFace or g1 not found');
            return;
        }

        // If clicking the same build point that's already showing, hide instead
        if (this._isShowing && this._currentBuildPoint === buildPoint) {
            this.hide();
            return;
        }

        this._currentBuildPoint = buildPoint;
        this._isShowing = true;

        // Position the builder menu at the build point's world position
        const worldPos = buildPoint.node.getWorldPosition();
        this.node.setWorldPosition(worldPos);

        // Activate and animate
        this._buildFace.active = true;
        this._g1.active = true;

        // Scale animation: 0 -> 1 with easeBackOut
        this._buildFace.setScale(new Vec3(0, 0, 1));
        tween(this._buildFace)
            .to(this.ANIM_DURATION, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        log(`[KR001Builder] Showing menu at build point ${buildPoint.buildPointIndex}`);
    }

    /**
     * Hide the build menu.
     *
     * Reference: builder.ts hiddenBuildFace()
     *   - scale animation from 1 to 0
     *   - then buildFace.active = false, g1.active = false
     */
    hide(): void {
        if (!this._buildFace) {
            return;
        }

        this._isShowing = false;
        this._currentBuildPoint = null;

        // If it's already inactive, just ensure state
        if (!this._buildFace.active) {
            return;
        }

        // Scale animation: 1 -> 0
        tween(this._buildFace)
            .to(this.ANIM_DURATION, { scale: new Vec3(0, 0, 1) })
            .call(() => {
                if (this._buildFace) {
                    this._buildFace.active = false;
                }
                if (this._g1) {
                    this._g1.active = false;
                }
            })
            .start();

        log('[KR001Builder] Hiding menu');
    }

    /**
     * Whether the menu is currently visible.
     */
    get isShowing(): boolean {
        return this._isShowing;
    }

    /**
     * Get the currently associated build point (or null if hidden).
     */
    get currentBuildPoint(): KR001BuildPoint | null {
        return this._currentBuildPoint;
    }
}
