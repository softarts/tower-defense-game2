import { _decorator, Component, Node, Vec3, Prefab, instantiate, resources, find, log } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { ArtilleryBullet } from './ArtilleryBullet';

const { ccclass, property } = _decorator;

/**
 * KR001ArtilleryTower handles artillery tower attack logic.
 *
 * Reference: kingdomRush-gxh1996 artilleryTower.ts
 * - update(): iterate monsters, check range, shoot first in-range
 * - shoot(des, time): fire artillery bullet at target position with flight time
 * - Longer range and cooldown than other towers
 * - Uses ArtilleryBullet for Bézier arc flight + AOE explosion + frame anim
 *
 * Architecture (mirrors reference):
 *   artilleryTower.ts → manages shooting, cooldown
 *   artilleryBullet.ts → Bézier arc flight + frame-anim explosion + AOE causeHarm
 *
 * NOTE: Reference project uses forecastMovePos() which requires monster.getPosInTime().
 * We don't have that interface, so we target current position directly
 * (same as the reference's else-branch: this.shoot(m.getWPos())).
 */
@ccclass('KR001ArtilleryTower')
export class KR001ArtilleryTower extends Component {

    private _canShoot: boolean = true;
    private _shootRange: number = CommonConstant.ARTILLERY_SHOOT_RANGE;
    private _bulletSpeed: number = CommonConstant.ARTILLERY_BULLET_SPEED;
    private _cooldown: number = CommonConstant.ARTILLERY_COOLDOWN;
    private _attack: number = CommonConstant.ARTILLERY_ATTACK;
    private _bombRange: number = CommonConstant.ARTILLERY_BOMB_RANGE;

    private _enemyRoot: Node | null = null;
    private _bulletPrefab: Prefab | null = null;

    onLoad(): void {
        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);

        resources.load(CommonConstant.PREFAB_ARTILLERY_BULLET, Prefab, (err, prefab) => {
            if (err) {
                log(`[KR001ArtilleryTower] Failed to load bullet prefab: ${err.message}`);
                return;
            }
            this._bulletPrefab = prefab;
        });
    }

    update(dt: number): void {
        if (!this._canShoot || !this._enemyRoot || !this._bulletPrefab) return;

        const enemies = this._enemyRoot.children;
        const myPos = this.node.getWorldPosition();

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const enemyPos = enemy.getWorldPosition();
            const dist = Vec3.distance(myPos, enemyPos);

            if (dist <= this._shootRange) {
                // Reference: artilleryTower.ts else-branch: this.shoot(m.getWPos())
                // Directly target current enemy position (no prediction needed)
                this.shoot(enemyPos);
                break;
            }
        }
    }

    /**
     * Fire an artillery shell at the target position.
     *
     * Reference: artilleryTower.ts shoot(des, time) → shootBullet → createBullet
     * - Calculates flight time from distance / speedOfBullet
     * - Passes flight time to bullet's moveTo(start, end, time)
     */
    private shoot(targetPos: Vec3): void {
        this._canShoot = false;

        const startPos = this.node.getWorldPosition();

        // Reference: artilleryTower.ts — time = distance / speedOfBullet
        const dist = Vec3.distance(startPos, targetPos);
        const flightTime = dist / this._bulletSpeed;

        const bulletNode = instantiate(this._bulletPrefab!);
        bulletNode.name = 'ArtilleryBullet';
        this.node.parent!.addChild(bulletNode);

        const bullet = bulletNode.getComponent(ArtilleryBullet) || bulletNode.addComponent(ArtilleryBullet);
        bullet.launch(startPos, targetPos, flightTime, this._attack, this._bombRange);

        this.scheduleOnce(() => {
            this._canShoot = true;
        }, this._cooldown);
    }
}
