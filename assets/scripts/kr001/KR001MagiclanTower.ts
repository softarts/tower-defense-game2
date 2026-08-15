import { _decorator, Component, Node, Vec3, Prefab, instantiate, resources, find, log } from 'cc';
import { CommonConstant } from './CommonConstant';
import { KR001Bullet } from './KR001Bullet';

const { ccclass, property } = _decorator;

/**
 * KR001MagiclanTower handles magic tower attack logic.
 *
 * Reference: kingdomRush-gxh1996 magiclanTower.ts
 * - update(): iterate monsters, check range, shoot first in-range enemy
 * - shoot(): create magic bullet, fly toward target
 * - coolingShoot(): scheduleOnce to re-enable shooting
 */
@ccclass('KR001MagiclanTower')
export class KR001MagiclanTower extends Component {

    private _canShoot: boolean = true;
    private _shootRange: number = CommonConstant.MAGICLAN_SHOOT_RANGE;
    private _bulletSpeed: number = CommonConstant.MAGICLAN_BULLET_SPEED;
    private _cooldown: number = CommonConstant.MAGICLAN_COOLDOWN;

    private _enemyRoot: Node | null = null;
    private _bulletPrefab: Prefab | null = null;

    onLoad(): void {
        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        resources.load(CommonConstant.PREFAB_MAGICLAN_BULLET, Prefab, (err, prefab) => {
            if (err) {
                log(`[KR001MagiclanTower] Failed to load bullet prefab: ${err.message}`);
                return;
            }
            this._bulletPrefab = prefab;
            log('[KR001MagiclanTower] Bullet prefab loaded');
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

        const bulletNode = instantiate(this._bulletPrefab!);
        bulletNode.name = 'MagicBullet';
        this.node.parent!.addChild(bulletNode);

        const bullet = bulletNode.addComponent(KR001Bullet);
        bullet.launch(startPos, endPos, this._bulletSpeed);

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
