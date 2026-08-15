import { _decorator, Component, Node, Vec3, Prefab, instantiate, resources, find, log } from 'cc';
import { CommonConstant } from './CommonConstant';
import { KR001Bullet } from './KR001Bullet';

const { ccclass, property } = _decorator;

/**
 * KR001ArrowTower handles arrow tower attack logic.
 *
 * Reference: kingdomRush-gxh1996 arrower.ts
 * - update(): iterate monsters, check range, shoot first in-range enemy
 * - shoot(): create arrow bullet, fly toward target
 * - coolingShoot(): scheduleOnce to re-enable shooting
 *
 * Simplified: no animation, no prediction, straight-line bullet.
 */
@ccclass('KR001ArrowTower')
export class KR001ArrowTower extends Component {

    private _canShoot: boolean = true;
    private _shootRange: number = CommonConstant.ARROW_SHOOT_RANGE;
    private _bulletSpeed: number = CommonConstant.ARROW_BULLET_SPEED;
    private _cooldown: number = CommonConstant.ARROW_COOLDOWN;

    private _enemyRoot: Node | null = null;
    private _bulletPrefab: Prefab | null = null;

    onLoad(): void {
        // Find EnemyRoot in scene
        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        // Preload bullet prefab
        resources.load(CommonConstant.PREFAB_ARROW_BULLET, Prefab, (err, prefab) => {
            if (err) {
                log(`[KR001ArrowTower] Failed to load bullet prefab: ${err.message}`);
                return;
            }
            this._bulletPrefab = prefab;
            log('[KR001ArrowTower] Bullet prefab loaded');
        });
    }

    update(dt: number): void {
        if (!this._canShoot || !this._enemyRoot || !this._bulletPrefab) return;

        const enemies = this._enemyRoot.children;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const dist = this.getWorldDistance(enemy);
            if (dist <= this._shootRange) {
                this.shoot(enemy);
                break;
            }
        }
    }

    private shoot(target: Node): void {
        this._canShoot = false;

        const startPos = this.node.getWorldPosition();
        const endPos = target.getWorldPosition();

        // Create and launch bullet
        const bulletNode = instantiate(this._bulletPrefab!);
        bulletNode.name = 'ArrowBullet';
        this.node.parent!.addChild(bulletNode);

        const bullet = bulletNode.addComponent(KR001Bullet);
        bullet.launch(startPos, endPos, this._bulletSpeed);

        // Cooldown
        this.scheduleOnce(() => {
            this._canShoot = true;
        }, this._cooldown);
    }

    private getWorldDistance(target: Node): number {
        const myPos = this.node.getWorldPosition();
        const targetPos = target.getWorldPosition();
        return Vec3.distance(myPos, targetPos);
    }
}
