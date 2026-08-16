import { _decorator, Component, Vec3, Vec2, Node, tween, find } from 'cc';
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
    private _endWorldPos: Vec3 = new Vec3();

    private _enemyRoot: Node | null = null;

    /**
     * Launch artillery shell.
     *
     * Reference: artilleryBullet.ts init() + moveTo()
     * - init(level, attack, bombRange): set damage parameters
     * - moveTo(start, end, time): Bézier curve flight
     */
    launch(startWorld: Vec3, endWorld: Vec3, speed: number, attack: number, bombRange: number): void {
        const parent = this.node.parent;
        if (!parent) return;

        this._attack = attack;
        this._bombRange = bombRange;
        this._endWorldPos.set(endWorld);

        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        // Convert world coords to parent's local space
        const parentWorldPos = parent.getWorldPosition();
        const localStart = new Vec2(startWorld.x - parentWorldPos.x, startWorld.y - parentWorldPos.y);
        const localEnd = new Vec2(endWorld.x - parentWorldPos.x, endWorld.y - parentWorldPos.y);

        // Control point: midpoint X, elevated Y (parabolic arc)
        // Reference: artilleryBullet.ts middle + c point calculation
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

        const dist = Vec2.distance(localStart, localEnd);
        this._duration = dist / speed;
        this._elapsed = 0;

        this.node.setPosition(localStart.x, localStart.y, 0);

        this._flying = true;
    }

    /**
     * Bézier interpolation each frame (no per-frame hit detection for artillery).
     * Artillery explodes on arrival, not on proximity.
     */
    update(dt: number): void {
        if (!this._flying) return;

        this._elapsed += dt;
        let t = this._elapsed / this._duration;

        if (t >= 1) {
            t = 1;
            this._flying = false;
            // Set final position
            this.node.setPosition(this._p2.x, this._p2.y, 0);
            // Explode on arrival
            this.onArrived();
            return;
        }

        // Quadratic Bézier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const mt = 1 - t;
        const x = mt * mt * this._p0.x + 2 * mt * t * this._p1.x + t * t * this._p2.x;
        const y = mt * mt * this._p0.y + 2 * mt * t * this._p1.y + t * t * this._p2.y;
        this.node.setPosition(x, y, 0);
    }

    /**
     * AOE explosion on arrival.
     *
     * Reference: artilleryBullet.ts causeHarm(pos)
     * - Iterates all alive monsters
     * - If distance to explosion point <= bombRange → injure(attack)
     * - Damages ALL enemies in range (not just one)
     */
    private onArrived(): void {
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
