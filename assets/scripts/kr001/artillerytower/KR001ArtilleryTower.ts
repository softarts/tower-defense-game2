import { _decorator, Component, Node, Vec3, Prefab, instantiate, resources, find, log } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { ArtilleryBullet } from './ArtilleryBullet';

const { ccclass, property } = _decorator;

/**
 * KR001ArtilleryTower handles artillery tower attack logic.
 *
 * Reference: kingdomRush-gxh1996 artilleryTower.ts
 * - update(): iterate monsters, check range, shoot first in-range
 * - forecastMovePos(): predict enemy position based on velocity
 * - shoot(): fire artillery bullet at predicted position
 * - Longer range and cooldown than other towers
 * - Uses ArtilleryBullet for Bézier arc flight + AOE explosion
 *
 * Architecture (mirrors reference):
 *   artilleryTower.ts → manages shooting, cooldown, prediction
 *   artilleryBullet.ts → Bézier arc flight + AOE causeHarm
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
    private _enemyLastPositions: Map<Node, Vec3> = new Map();

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
                const predictedPos = this.forecastPosition(enemy, enemyPos, dt);
                this.shoot(predictedPos);
                break;
            }
        }

        this.updateLastPositions();
    }

    /**
     * Predict enemy position at the time the bullet arrives.
     *
     * Reference: artilleryTower.ts forecastMovePos(monster, cP)
     * - Calculates bullet flight time based on distance
     * - Uses enemy velocity (current - last position) to predict future position
     */
    private forecastPosition(enemy: Node, currentPos: Vec3, dt: number): Vec3 {
        const startPos = this.node.getWorldPosition();
        const dist = Vec3.distance(startPos, currentPos);
        const flightTime = dist / this._bulletSpeed;

        const lastPos = this._enemyLastPositions.get(enemy);
        if (!lastPos || dt <= 0) return currentPos.clone();

        const vx = (currentPos.x - lastPos.x) / dt;
        const vy = (currentPos.y - lastPos.y) / dt;

        return new Vec3(
            currentPos.x + vx * flightTime,
            currentPos.y + vy * flightTime,
            0
        );
    }

    private updateLastPositions(): void {
        if (!this._enemyRoot) return;
        this._enemyLastPositions.clear();
        for (const enemy of this._enemyRoot.children) {
            if (enemy.active) {
                this._enemyLastPositions.set(enemy, enemy.getWorldPosition().clone());
            }
        }
    }

    /**
     * Fire an artillery shell at the target position.
     *
     * Reference: artilleryTower.ts shoot(des, time) → shootBullet → createBullet
     * Uses ArtilleryBullet with Bézier arc + AOE explosion.
     */
    private shoot(targetPos: Vec3): void {
        this._canShoot = false;

        const startPos = this.node.getWorldPosition();

        const bulletNode = instantiate(this._bulletPrefab!);
        bulletNode.name = 'ArtilleryBullet';
        this.node.parent!.addChild(bulletNode);

        const bullet = bulletNode.addComponent(ArtilleryBullet);
        bullet.launch(startPos, targetPos, this._bulletSpeed, this._attack, this._bombRange);

        this.scheduleOnce(() => {
            this._canShoot = true;
        }, this._cooldown);
    }
}
