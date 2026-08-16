import { _decorator, Component, Vec3, Vec2, tween, UIOpacity } from 'cc';

const { ccclass, property } = _decorator;

/**
 * ArrowBullet — arrow projectile flight and rotation.
 *
 * STRICT port of kingdomRush-gxh1996 arrowBullet.ts moveTo() + updateDir():
 *
 * Reference logic:
 *   1. Convert world start/end to parent's LOCAL coordinates via convertToNodeSpaceAR
 *   2. Control point = (midX, endY + 60)
 *   3. cc.bezierTo(time, [localStart, control, localEnd])
 *   4. updateDir() every 0.07s: compute direction from lastPos→curPos, getDegree, set rotation
 *   5. rotation = -(offsetDegree + degree), offsetDegree=180 (arrow faces left at 0°)
 *   6. On arrival: fade out → destroy
 *
 * Cocos 3.x differences:
 *   - No cc.bezierTo action. Use update()-based manual Bézier interpolation.
 *   - node.rotation (CW positive in 2.x) → eulerAngles.z = -rotation (CCW positive in 3.x)
 *   - convertToNodeSpaceAR → use worldPosition math since parent is known
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

    // For direction tracking (reference: updateDir every 0.07s)
    private _lastPos: Vec2 = new Vec2();
    private _isUpdateDir: boolean = false;
    private readonly OFFSET_DEGREE: number = 180;

    /**
     * Launch arrow. Mirrors arrowBullet.ts moveTo(start, end, time).
     *
     * @param startWorld - World position of shooter (archer)
     * @param endWorld - World position of target (enemy)
     * @param speed - Arrow speed in pixels/second
     */
    launch(startWorld: Vec3, endWorld: Vec3, speed: number): void {
        const parent = this.node.parent;
        if (!parent) return;

        // Convert world coords to parent's local space
        // (reference: this.node.parent.convertToNodeSpaceAR(worldPos))
        const parentWorldPos = parent.getWorldPosition();
        const localStart = new Vec2(startWorld.x - parentWorldPos.x, startWorld.y - parentWorldPos.y);
        const localEnd = new Vec2(endWorld.x - parentWorldPos.x, endWorld.y - parentWorldPos.y);

        // Control point (reference: middle with Y = endY + 60)
        const midX = (localStart.x + localEnd.x) / 2;
        const midY = (localStart.y + localEnd.y) / 2;
        let controlX = midX;
        const controlY = localEnd.y + 60;
        // Reference: if (start.x === end.x) c.x += 30;
        if (Math.abs(startWorld.x - endWorld.x) < 1) {
            controlX += 30;
        }

        this._p0.set(localStart);
        this._p1.set(controlX, controlY);
        this._p2.set(localEnd);

        // Duration = distance / speed (reference: time param from arrower)
        const dist = Vec2.distance(localStart, localEnd);
        this._duration = dist / speed;
        this._elapsed = 0;

        // Set initial position
        this.node.setPosition(localStart.x, localStart.y, 0);

        // Set initial rotation based on direction (reference: init() dir check)
        if (startWorld.x > endWorld.x) {
            this.setRotation2x(50);
        } else {
            this.setRotation2x(-230);
        }

        this._flying = true;
        this._isUpdateDir = true;
        this._lastPos.set(localStart);

        // Start direction updates (reference: scheduleOnce(updateDir, 0.07))
        this.scheduleOnce(() => this.doUpdateDir(), 0.07);
    }

    /**
     * Manual Bézier interpolation each frame.
     * Replaces cc.bezierTo action from Cocos 2.x.
     * B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
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
        }

        // Quadratic Bézier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const mt = 1 - t;
        const x = mt * mt * this._p0.x + 2 * mt * t * this._p1.x + t * t * this._p2.x;
        const y = mt * mt * this._p0.y + 2 * mt * t * this._p1.y + t * t * this._p2.y;

        this.node.setPosition(x, y, 0);
    }

    /**
     * Direction update (reference: arrowBullet.ts updateDir, every 0.07s).
     */
    private doUpdateDir(): void {
        if (!this._isUpdateDir) return;

        const curPos = new Vec2(this.node.position.x, this.node.position.y);
        const dx = curPos.x - this._lastPos.x;
        const dy = curPos.y - this._lastPos.y;

        const degree = this.getDegree(dx, dy);
        if (degree !== null) {
            // Reference: this.node.rotation = -(this.offsetDegree + degree);
            this.setRotation2x(-(this.OFFSET_DEGREE + degree));
        }

        this._lastPos.set(curPos);

        if (this._isUpdateDir) {
            this.scheduleOnce(() => this.doUpdateDir(), 0.07);
        }
    }

    /**
     * Exact port of arrowBullet.ts getDegree(dir).
     * Returns angle in [0, 360) from direction vector, or null if no movement.
     */
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

    /**
     * Set rotation using Cocos 2.x convention (clockwise positive).
     * Cocos 3.x eulerAngles.z is counter-clockwise positive → negate.
     */
    private setRotation2x(rotation2x: number): void {
        this.node.setRotationFromEuler(0, 0, -rotation2x);
    }

    /**
     * After arriving at target: fade out then destroy.
     * Reference: isFallFloor=true → sprite=decalArrow → fadeOut(2) → destroySelf
     */
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
