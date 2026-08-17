import { _decorator, Component, Vec3, Vec2, Node, Sprite, SpriteFrame, resources, find, UIOpacity, log } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { KR001EnemyController } from '../KR001EnemyController';

const { ccclass, property } = _decorator;

/**
 * ArtilleryBullet — artillery projectile with Bézier arc and AOE explosion.
 *
 * Reference: kingdomRush-gxh1996 artilleryBullet.ts
 * - moveTo(start, end, time): Bézier curve flight (parabolic arc)
 * - causeHarm(pos): damage all enemies within bombRange (AOE)
 * - No per-frame hit detection — explodes on arrival
 * - Explosion: frame animation (bom1~bom10) after bullet arrives
 *
 * Difference from ArrowBullet/MagiclanBullet:
 * - Bézier curve (parabolic arc, like a cannonball)
 * - AOE: damages ALL enemies within bombRange, not just one
 * - No rotation (round cannonball)
 */
@ccclass('ArtilleryBullet')
export class ArtilleryBullet extends Component {

    // Bézier curve points (in parent's LOCAL space)
    private _p0: Vec2 = new Vec2();
    private _p1: Vec2 = new Vec2(); // control point (apex of arc)
    private _p2: Vec2 = new Vec2();

    private _duration: number = 0;
    private _elapsed: number = 0;
    private _flying: boolean = false;

    private _attack: number = 6;
    private _bombRange: number = 50;

    private _enemyRoot: Node | null = null;

    // ─── Explosion frame animation ───
    /** Sprite on this node (bullet visual) */
    private _bulletSprite: Sprite | null = null;
    /** Preloaded explosion SpriteFrames (bom1~bom10) */
    private _bombFrames: SpriteFrame[] = [];
    private _bombFrameLoaded: number = 0;
    private _bombFrameTotal: number = 10;

    /** Frame animation state */
    private _exploding: boolean = false;
    private _explodeIndex: number = 0;
    private _explodeTimer: number = 0;
    /** Seconds per explosion frame (reference: frameAnimation.ts playSpeed = 0.1) */
    private readonly EXPLODE_FRAME_SPEED: number = 0.1;

    onLoad(): void {
        this._bulletSprite = this.node.getComponent(Sprite);
        this._loadBombFrames();
    }

    /**
     * Preload explosion sequence frames bom1.png ~ bom10.png.
     * Reference: artilleryBullet uses frameAnimation component bound to bom sprites.
     */
    private _loadBombFrames(): void {
        this._bombFrames = new Array(this._bombFrameTotal).fill(null);

        for (let i = 1; i <= this._bombFrameTotal; i++) {
            const idx = i - 1;
            const path = `textures/tower/bullet/bomb/bom${i}/spriteFrame`;
            resources.load(path, SpriteFrame, (err, sf) => {
                if (err) {
                    log(`[ArtilleryBullet] Failed to load bom${i}: ${err.message}`);
                    this._bombFrameLoaded++;
                    return;
                }
                this._bombFrames[idx] = sf;
                this._bombFrameLoaded++;
            });
        }
    }

    /**
     * Launch artillery shell.
     *
     * Reference: artilleryBullet.ts init() + moveTo()
     * - init(level, attack, bombRange): set damage parameters
     * - moveTo(start, end, time): Bézier curve flight
     */
    launch(startWorld: Vec3, endWorld: Vec3, flightTime: number, attack: number, bombRange: number): void {
        const parent = this.node.parent;
        if (!parent) return;

        this._attack = attack;
        this._bombRange = bombRange;

        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        // Convert world coords to parent's local space
        // Reference: artilleryBullet.ts moveTo → convertToNodeSpaceAR
        const parentWorldPos = parent.getWorldPosition();
        const localStart = new Vec2(startWorld.x - parentWorldPos.x, startWorld.y - parentWorldPos.y);
        const localEnd = new Vec2(endWorld.x - parentWorldPos.x, endWorld.y - parentWorldPos.y);

        // Control point: midpoint X, elevated Y (parabolic arc)
        // Reference: artilleryBullet.ts middle + c point calculation
        // c = cc.v2(middle.x, nodeEnd.y + 60)
        const sub = new Vec2(localEnd.x - localStart.x, localEnd.y - localStart.y);
        const midX = localStart.x + sub.x / 2;
        let controlX = midX;
        const controlY = localEnd.y + 60;
        if (Math.abs(startWorld.x - endWorld.x) < 1) {
            controlX += 30;
        }

        this._p0.set(localStart);
        this._p1.set(controlX, controlY);
        this._p2.set(localEnd);

        this._duration = flightTime;
        this._elapsed = 0;

        this.node.setPosition(localStart.x, localStart.y, 0);

        // Make sure bullet sprite is visible
        if (this._bulletSprite) {
            this._bulletSprite.enabled = true;
        }
        const opacity = this.node.getComponent(UIOpacity);
        if (opacity) opacity.opacity = 255;

        this._flying = true;
        this._exploding = false;
    }

    /**
     * Bézier interpolation each frame (no per-frame hit detection for artillery).
     * Artillery explodes on arrival, not on proximity.
     *
     * Reference: artilleryBullet.ts uses cc.bezierTo action — same quadratic Bézier.
     */
    update(dt: number): void {
        if (this._exploding) {
            this._updateExplosion(dt);
            return;
        }

        if (!this._flying) return;

        this._elapsed += dt;
        let t = this._elapsed / this._duration;

        if (t >= 1) {
            t = 1;
            this._flying = false;
            // Set final position
            this.node.setPosition(this._p2.x, this._p2.y, 0);
            // Explode on arrival
            this._startExplosion();
            return;
        }

        // Quadratic Bézier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const mt = 1 - t;
        const x = mt * mt * this._p0.x + 2 * mt * t * this._p1.x + t * t * this._p2.x;
        const y = mt * mt * this._p0.y + 2 * mt * t * this._p1.y + t * t * this._p2.y;
        this.node.setPosition(x, y, 0);
    }

    /**
     * Start explosion animation.
     *
     * Reference: artilleryBullet.ts func callback after cc.bezierTo:
     *   frameAnim.play(false, true, false, function() {
     *       this.causeHarm(end);
     *       this.destroySelf();
     *   })
     * We replicate the same sequence: play bom frames → causeHarm → destroy.
     */
    private _startExplosion(): void {
        // Hide bullet sprite, show explosion
        if (this._bulletSprite) {
            this._bulletSprite.enabled = false;
        }

        if (this._bombFrames.filter(f => f !== null).length === 0) {
            // Frames not loaded yet — deal damage and destroy immediately
            this._onExplosionEnd();
            return;
        }

        this._exploding = true;
        this._explodeIndex = 0;
        this._explodeTimer = 0;

        // Show first frame immediately
        if (this._bulletSprite && this._bombFrames[0]) {
            this._bulletSprite.enabled = true;
            this._bulletSprite.spriteFrame = this._bombFrames[0];
        }
    }

    /**
     * Advance explosion frame animation each dt.
     * Reference: frameAnimation.ts update(dt) — advance frame every playSpeed seconds.
     */
    private _updateExplosion(dt: number): void {
        this._explodeTimer += dt;

        if (this._explodeTimer >= this.EXPLODE_FRAME_SPEED) {
            this._explodeTimer = 0;
            this._explodeIndex++;

            if (this._explodeIndex >= this._bombFrameTotal) {
                // Animation complete
                this._exploding = false;
                this._onExplosionEnd();
                return;
            }

            if (this._bulletSprite && this._bombFrames[this._explodeIndex]) {
                this._bulletSprite.spriteFrame = this._bombFrames[this._explodeIndex];
            }
        }
    }

    /**
     * Explosion animation finished: deal AOE damage then destroy.
     *
     * Reference: artilleryBullet.ts causeHarm(end) then destroySelf()
     */
    private _onExplosionEnd(): void {
        this.causeHarm();
        this.node.destroy();
    }

    /**
     * Cause AOE damage to all enemies within bombRange of the explosion point.
     *
     * Reference: artilleryBullet.ts causeHarm(pos) + isInjuredInScope(pos, mwp)
     */
    private causeHarm(): void {
        if (!this._enemyRoot) return;

        const explosionPos = this.node.getWorldPosition();
        const enemies = this._enemyRoot.children;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const enemyPos = enemy.getWorldPosition();
            const dist = Vec3.distance(explosionPos, enemyPos);

            if (dist <= this._bombRange) {
                const controller = enemy.getComponent(KR001EnemyController);
                if (controller) {
                    controller.injure(this._attack);
                }
            }
        }
    }
}
