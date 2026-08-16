import { _decorator, Component, Node, Vec3, Prefab, instantiate, find } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { KR001ArrowTower } from './KR001ArrowTower';
import { ArrowBullet } from './ArrowBullet';

const { ccclass, property } = _decorator;

/**
 * KR001Arrower — individual archer on an arrow tower.
 *
 * Strict reference: kingdomRush-gxh1996 arrower.ts
 * - update(): if not shooting, iterate monsters, check inShootRange(worldPos)
 * - shoot(des): create arrow, call arrowBullet.moveTo(archerWorldPos, targetWorldPos, time)
 * - time = distance / speedOfArrow
 * - coolingShoot(): scheduleOnce → shooting = false
 *
 * Key: shoots at enemy's CURRENT world position (prediction removed for accuracy).
 */
@ccclass('KR001Arrower')
export class KR001Arrower extends Component {

    private _tower: KR001ArrowTower | null = null;
    private _shootRange: number = 150;
    private _bulletSpeed: number = 180;
    private _cooldown: number = 1.2;
    private _shooting: boolean = false;
    private _enemyRoot: Node | null = null;

    init(tower: KR001ArrowTower, shootRange: number, bulletSpeed: number, cooldown: number): void {
        this._tower = tower;
        this._shootRange = shootRange;
        this._bulletSpeed = bulletSpeed;
        this._cooldown = cooldown;
        this._enemyRoot = find(`Canvas/${CommonConstant.NODE_ENEMY_ROOT}`);
    }

    /**
     * Reference: arrower.ts update(dt)
     * - if (!this.shooting) iterate through monsterArray
     * - check inShootRange using TOWER's world position (not archer's)
     * - shoot at enemy's world position
     */
    update(dt: number): void {
        if (this._shooting || !this._enemyRoot || !this._tower) return;

        const prefab = this._tower.getBulletPrefab();
        if (!prefab) return;

        const enemies = this._enemyRoot.children;
        // Reference uses tower's world position for range check
        const towerWorldPos = this._tower.node.getWorldPosition();

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const enemyPos = enemy.getWorldPosition();
            const dist = Vec3.distance(towerWorldPos, enemyPos);

            if (dist <= this._shootRange) {
                this.shoot(enemyPos, prefab);
                break;
            }
        }
    }

    /**
     * Fire an arrow toward target world position.
     *
     * Reference: arrower.ts shoot(des, time)
     * - shooting = true
     * - let arrow = arrowTower.getArrowBullet()
     * - this.node.addChild(arrow) ← arrow is child of archer
     * - arrowBullet.moveTo(this.wPosOfArrower, des, time)
     * - coolingShoot()
     *
     * NOTE: In reference, arrow is added as child of the archer node.
     * We add to BuildRoot (tower's parent) instead, which is simpler for world coord math.
     */
    private shoot(targetWorldPos: Vec3, prefab: Prefab): void {
        this._shooting = true;

        const startWorldPos = this.node.getWorldPosition();

        // Create bullet node
        const bulletNode = instantiate(prefab);
        bulletNode.name = 'ArrowBullet';
        // Add to tower's parent (BuildRoot) — same coordinate space
        this._tower!.node.parent!.addChild(bulletNode);

        // Launch with ArrowBullet component
        const bullet = bulletNode.addComponent(ArrowBullet);
        bullet.launch(startWorldPos, targetWorldPos, this._bulletSpeed);

        // Cooldown (reference: arrower.ts coolingShoot)
        this.scheduleOnce(() => {
            this._shooting = false;
        }, this._cooldown);
    }
}
