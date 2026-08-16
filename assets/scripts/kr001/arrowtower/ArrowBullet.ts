import { _decorator, Component, Vec3, Vec2, tween, UIOpacity, Node, find } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { KR001EnemyController } from '../KR001EnemyController';

const { ccclass, property } = _decorator;

/**
 * ArrowBullet — arrow projectile flight, rotation, and hit detection.
 *
 * Reference: kingdomRush-gxh1996 arrowBullet.ts
 * - moveTo(): Bézier curve flight
 * - updateDir(): rotation to face movement direction
 * - onCollisionEnter(): if group==="Enemy" → monster.injure(attack) → destroySelf
 *
 * Cocos 3.x adaptation:
 * - Manual Bézier interpolation in update()
 * - Distance-based hit detection (check proximity to enemies each frame)
 *   instead of physics colliders (simpler, no RigidBody2D needed)
 * - On hit: call enemy.injure(attack) → destroy self
 */
@ccclass('ArrowBullet')
export class ArrowBullet extends Component {

    // Bézier curve points (in parent's LOCAL space)
    private _p0: Vec2 = new Vec2();
    private _p1: Vec2 = new Vec2(); // control point
    private _p2: Vec2 = new Vec2();

    private _duration: number = 0;
    private _elapsed: number = 0;
    private _flying: boolean = false;
    private _hitDetected: boolean = false;

    // For direction tracking
    private _lastPos: Vec2 = new Vec2();
    private _isUpdateDir: boolean = false;
    private readonly OFFSET_DEGREE: number = 180;

    // Attack damage (reference: arrowBullet.ts this.attack)
    private _attack: number = 4;

    // Hit detection radius (in world pixels)
    private readonly HIT_RADIUS: number = 30;

    // EnemyRoot reference for hit detection
    private _enemyRoot: Node | null = null;

    /**
     * Launch arrow.
     */
    launch(startWorld: Vec3, endWorld: Vec3, speed: number, attack?: number): void {
        const parent = this.node.parent;
        if (!parent) return;

        if (attack !== undefined) {
            this._attack = attack;
        }

        // Find EnemyRoot for hit detection
        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        // Convert world coords to parent's local space
        const parentWorldPos = parent.getWorldPosition();
        const localStart = new Vec2(startWorld.x - parentWorldPos.x, startWorld.y - parentWorldPos.y);
        const localEnd = new Vec2(endWorld.x - parentWorldPos.x, endWorld.y - parentWorldPos.y);

        // Control point
        const midX = (localStart.x + localEnd.x) / 2;
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

        if (startWorld.x > endWorld.x) {
            this.setRotation2x(50);
        } else {
            this.setRotation2x(-230);
        }

        this._flying = true;
        this._hitDetected = false;
        this._isUpdateDir = true;
        this._lastPos.set(localStart);

        this.scheduleOnce(() => this.doUpdateDir(), 0.07);
    }

    /**
     * Bézier interpolation + hit detection each frame.
     */
    update(dt: number): void {
        if (!this._flying) return;

        this._elapsed += dt;
        let t = this._elapsed / this._duration;

        if (t >= 1) {
            t = 1;
            this._flying = false;
            this._isUpdateDir = false;
            this.onArrived();
            return;
        }

        // Quadratic Bézier
        const mt = 1 - t;
        const x = mt * mt * this._p0.x + 2 * mt * t * this._p1.x + t * t * this._p2.x;
        const y = mt * mt * this._p0.y + 2 * mt * t * this._p1.y + t * t * this._p2.y;
        this.node.setPosition(x, y, 0);

        // Hit detection (reference: arrowBullet.ts onCollisionEnter)
        if (!this._hitDetected) {
            this.checkHit();
        }
    }

    /**
     * Distance-based hit detection.
     * Reference: arrowBullet.ts onCollisionEnter checks group==="Enemy"
     * We check distance to each enemy's world position instead.
     */
    private checkHit(): void {
        if (!this._enemyRoot) return;

        const arrowWorldPos = this.node.getWorldPosition();
        const enemies = this._enemyRoot.children;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const enemyPos = enemy.getWorldPosition();
            const dist = Vec3.distance(arrowWorldPos, enemyPos);

            if (dist <= this.HIT_RADIUS) {
                this.onHitEnemy(enemy);
                return;
            }
        }
    }

    /**
     * Called when arrow hits an enemy.
     * Reference: arrowBullet.ts onCollisionEnter →
     *   this.node.stopAllActions();
     *   monster.injure(this.attack);
     *   this.destroySelf();
     */
    private onHitEnemy(enemyNode: Node): void {
        this._hitDetected = true;
        this._flying = false;
        this._isUpdateDir = false;

        // Apply damage
        const controller = enemyNode.getComponent(KR001EnemyController);
        if (controller) {
            controller.injure(this._attack);
        }

        // Destroy arrow immediately
        this.node.destroy();
    }

    private doUpdateDir(): void {
        if (!this._isUpdateDir) return;

        const curPos = new Vec2(this.node.position.x, this.node.position.y);
        const dx = curPos.x - this._lastPos.x;
        const dy = curPos.y - this._lastPos.y;

        const degree = this.getDegree(dx, dy);
        if (degree !== null) {
            this.setRotation2x(-(this.OFFSET_DEGREE + degree));
        }

        this._lastPos.set(curPos);

        if (this._isUpdateDir) {
            this.scheduleOnce(() => this.doUpdateDir(), 0.07);
        }
    }

    private getDegree(dx: number, dy: number): number | null {
        if (dx === 0 && dy === 0) return null;
        if (dx === 0 && dy > 0) return 90;
        if (dx === 0 && dy < 0) return 270;

        let rot = Math.atan(dy / dx) * 180 / Math.PI;

        if (rot === 0) {
            rot = dx > 0 ? 0 : 180;
        } else if ((dx < 0 && dy > 0) || (dx < 0 && dy < 0)) {
            rot += 180;
        } else if (dx > 0 && dy < 0) {
            rot += 360;
        }

        return rot;
    }

    private setRotation2x(rotation2x: number): void {
        this.node.setRotationFromEuler(0, 0, -rotation2x);
    }

    private onArrived(): void {
        let opacity = this.node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = this.node.addComponent(UIOpacity);
        }
        tween(opacity)
            .to(0.5, { opacity: 0 })
            .call(() => {
                this.node.destroy();
            })
            .start();
    }
}
