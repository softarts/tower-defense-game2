import { _decorator, Component, Vec3, Node, tween, find } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { KR001EnemyController } from '../KR001EnemyController';

const { ccclass, property } = _decorator;

/**
 * MagiclanBullet — magic projectile with hit detection.
 *
 * Reference: kingdomRush-gxh1996 magiclanBullet.ts
 * - moveTo(start, end, time): Bézier curve flight
 * - onCollisionEnter: damage enemy on hit
 * - No rotation (round orb)
 */
@ccclass('MagiclanBullet')
export class MagiclanBullet extends Component {

    private _flying: boolean = false;
    private _attack: number = 8;
    private _enemyRoot: Node | null = null;
    private readonly HIT_RADIUS: number = 30;

    launch(startWorldPos: Vec3, endWorldPos: Vec3, speed: number, attack?: number): void {
        this.node.setWorldPosition(startWorldPos);
        if (attack !== undefined) this._attack = attack;

        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        const distance = Vec3.distance(startWorldPos, endWorldPos);
        const duration = distance / speed;

        const midX = (startWorldPos.x + endWorldPos.x) / 2;
        const controlY = endWorldPos.y + 60;
        let controlX = midX;
        if (Math.abs(startWorldPos.x - endWorldPos.x) < 1) {
            controlX += 30;
        }
        const controlPoint = new Vec3(controlX, controlY, 0);

        this._flying = true;

        const upDuration = duration * 0.45;
        const downDuration = duration * 0.55;

        tween(this.node)
            .to(upDuration, { worldPosition: controlPoint }, { easing: 'sineOut' })
            .to(downDuration, { worldPosition: endWorldPos }, { easing: 'sineIn' })
            .call(() => {
                this._flying = false;
                this.node.destroy();
            })
            .start();
    }

    update(dt: number): void {
        if (!this._flying || !this._enemyRoot) return;
        this.checkHit();
    }

    private checkHit(): void {
        const bulletPos = this.node.getWorldPosition();
        const enemies = this._enemyRoot!.children;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const dist = Vec3.distance(bulletPos, enemy.getWorldPosition());
            if (dist <= this.HIT_RADIUS) {
                const controller = enemy.getComponent(KR001EnemyController);
                if (controller) {
                    controller.injure(this._attack);
                }
                this._flying = false;
                this.node.destroy();
                return;
            }
        }
    }
}
