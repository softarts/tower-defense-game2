import { _decorator, Component, Vec3, tween, log } from 'cc';

const { ccclass, property } = _decorator;

/**
 * KR001Bullet is a projectile that flies from a tower toward a target position.
 *
 * Reference: kingdomRush-gxh1996 arrowBullet.ts / magiclanBullet.ts
 * - moveTo(start, end, time): Bézier curve flight
 * - On arrival: destroy self
 *
 * Simplified: straight-line tween flight, no damage logic yet.
 */
@ccclass('KR001Bullet')
export class KR001Bullet extends Component {

    /**
     * Launch the bullet from startPos to endPos over the given duration.
     * Both positions are in world coordinates.
     *
     * @param startWorldPos - Bullet starting world position (tower shoot point)
     * @param endWorldPos - Target world position (enemy position)
     * @param speed - Bullet travel speed (pixels/second)
     */
    launch(startWorldPos: Vec3, endWorldPos: Vec3, speed: number): void {
        this.node.setWorldPosition(startWorldPos);

        const distance = Vec3.distance(startWorldPos, endWorldPos);
        const duration = distance / speed;

        // Compute a slight arc (control point above midpoint)
        const midX = (startWorldPos.x + endWorldPos.x) / 2;
        const midY = Math.max(startWorldPos.y, endWorldPos.y) + 40;
        const arcPos = new Vec3(midX, midY, 0);

        // Use two-step tween for a slight arc effect
        const halfDur = duration / 2;

        tween(this.node)
            .to(halfDur, { worldPosition: arcPos })
            .to(halfDur, { worldPosition: endWorldPos })
            .call(() => {
                this.node.destroy();
            })
            .start();
    }
}
