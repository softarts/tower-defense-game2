import { _decorator, Component, Vec3, Vec2, tween, UIOpacity } from 'cc';

const { ccclass, property } = _decorator;

/**
 * MagiclanBullet is a magic projectile.
 *
 * Reference: kingdomRush-gxh1996 magiclanBullet.ts
 * - moveTo(start, end, time): Bézier curve, controlPoint = midpoint Y+60
 * - On arrival: destroy (via pool return in reference)
 * - No rotation (magic orb is round, doesn't need direction)
 *
 * Simplified: arc tween flight, no rotation, destroy on arrival.
 */
@ccclass('MagiclanBullet')
export class MagiclanBullet extends Component {

    /**
     * Launch the magic bullet.
     * Reference: magiclanBullet.ts moveTo(start, end, time)
     */
    launch(startWorldPos: Vec3, endWorldPos: Vec3, speed: number): void {
        this.node.setWorldPosition(startWorldPos);

        const distance = Vec3.distance(startWorldPos, endWorldPos);
        const duration = distance / speed;

        // Control point (reference: midpoint with Y = endY + 60)
        const midX = (startWorldPos.x + endWorldPos.x) / 2;
        const controlY = endWorldPos.y + 60;
        let controlX = midX;
        if (Math.abs(startWorldPos.x - endWorldPos.x) < 1) {
            controlX += 30;
        }
        const controlPoint = new Vec3(controlX, controlY, 0);

        const upDuration = duration * 0.45;
        const downDuration = duration * 0.55;

        tween(this.node)
            .to(upDuration, { worldPosition: controlPoint }, { easing: 'sineOut' })
            .to(downDuration, { worldPosition: endWorldPos }, { easing: 'sineIn' })
            .call(() => {
                this.node.destroy();
            })
            .start();
    }
}
