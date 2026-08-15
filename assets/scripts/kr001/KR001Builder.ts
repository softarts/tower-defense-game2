import { _decorator, Component, Node, log, tween, Vec3 } from 'cc';
import { KR001BuildPoint } from './KR001BuildPoint';
import { CommonConstant } from './CommonConstant';

const { ccclass, property } = _decorator;

/**
 * KR001Builder manages the circular build menu that appears when clicking a build point.
 *
 * Reference: kingdomRush-gxh1996 builder.ts
 * - outBuildFace(): shows the menu with scale animation
 * - hiddenBuildFace(): hides with scale-down animation
 * - buildArrowTower/buildBarrackTower/etc: instantiate tower prefab
 *
 * This is a single-instance component placed on a node in the scene.
 * When a build point is clicked, show() is called to display the menu
 * at that build point's position. When a tower button is clicked,
 * it notifies the current build point to instantiate the selected tower.
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
    private readonly ANIM_DURATION: number = CommonConstant.BUILDER_ANIM_DURATION;

    onLoad(): void {
        this._buildFace = this.node.getChildByName('buildFace');
        if (this._buildFace) {
            this._g1 = this._buildFace.getChildByName('g1');
        }

        // Register click events on tower buttons
        this.registerButtonEvents();

        // Start hidden
        this.hide();
    }

    /**
     * Register touch events on the 4 tower button nodes in g1.
     * Uses TOUCH_END on each button node for click detection.
     */
    private registerButtonEvents(): void {
        if (!this._g1) return;

        const buttons = ['arrow', 'barrack', 'magiclan', 'artillery'];
        for (const btnName of buttons) {
            const btnNode = this._g1.getChildByName(btnName);
            if (btnNode) {
                btnNode.on(Node.EventType.TOUCH_END, () => {
                    this.onBuildClicked(btnName);
                }, this);
            } else {
                log(`[KR001Builder] Warning: button node '${btnName}' not found in g1`);
            }
        }
    }

    /**
     * Handle a tower button click.
     * Notifies the current build point to build the selected tower type.
     *
     * Reference: builder.ts buildArrowTower() → buildTower(prefab, component, cost)
     */
    private onBuildClicked(buildType: string): void {
        log(`[KR001Builder] Tower selected: ${buildType}`);

        if (!this._currentBuildPoint) {
            log('[KR001Builder] No current build point, ignoring');
            return;
        }

        // Notify the build point to perform the build
        this._currentBuildPoint.onBuildSelected(buildType);

        // Hide menu immediately (reference: hiddenBuildFaceImmediately)
        this.hideImmediately();
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
     * Hide the build menu with animation.
     *
     * Reference: builder.ts hiddenBuildFace()
     */
    hide(): void {
        if (!this._buildFace) {
            return;
        }

        this._isShowing = false;
        this._currentBuildPoint = null;

        if (!this._buildFace.active) {
            return;
        }

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
     * Hide the build menu immediately without animation.
     *
     * Reference: builder.ts hiddenBuildFaceImmediately()
     */
    hideImmediately(): void {
        if (!this._buildFace) return;

        this._isShowing = false;
        this._currentBuildPoint = null;

        this._buildFace.setScale(new Vec3(0, 0, 1));
        this._buildFace.active = false;
        if (this._g1) {
            this._g1.active = false;
        }
    }

    get isShowing(): boolean {
        return this._isShowing;
    }

    get currentBuildPoint(): KR001BuildPoint | null {
        return this._currentBuildPoint;
    }
}
