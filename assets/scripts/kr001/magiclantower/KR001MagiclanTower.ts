import { _decorator, Component, Node, Vec3, Prefab, instantiate, resources, find, log } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { MagiclanBullet } from './MagiclanBullet';

const { ccclass, property } = _decorator;

/**
 * KR001MagiclanTower — magic tower attack logic.
 *
 * Reference: kingdomRush-gxh1996 magiclanTower.ts
 * - update(): find CLOSEST enemy in range, shoot at it
 * - shoot(): create magic bullet toward target
 * - coolingShoot(): scheduleOnce cooldown
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
        });
    }

    update(dt: number): void {
        if (!this._canShoot || !this._enemyRoot || !this._bulletPrefab) return;

        const enemies = this._enemyRoot.children;
        const myPos = this.node.getWorldPosition();

        // Find closest enemy in range
        let closestEnemy: Node | null = null;
        let closestDist = Infinity;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const enemyPos = enemy.getWorldPosition();
            const dist = Vec3.distance(myPos, enemyPos);

            if (dist <= this._shootRange && dist < closestDist) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }

        if (closestEnemy) {
            this.shoot(closestEnemy.getWorldPosition());
        }
    }

    private shoot(targetPos: Vec3): void {
        this._canShoot = false;

        const startPos = this.node.getWorldPosition();

        const bulletNode = instantiate(this._bulletPrefab!);
        bulletNode.name = 'MagicBullet';
        this.node.parent!.addChild(bulletNode);

        const bullet = bulletNode.addComponent(MagiclanBullet);
        bullet.launch(startPos, targetPos, this._bulletSpeed, CommonConstant.MAGICLAN_ATTACK);

        this.scheduleOnce(() => {
            this._canShoot = true;
        }, this._cooldown);
    }
}
