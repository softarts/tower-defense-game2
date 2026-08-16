import { _decorator, Component, Node, Vec3, UIOpacity, tween, log } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { KR001EnemyController } from '../KR001EnemyController';
import { KR001BarrackTower } from './KR001BarrackTower';

const { ccclass, property } = _decorator;

/**
 * KR001Soldier — individual soldier with melee combat AI.
 *
 * Reference: kingdomRush-gxh1996 soldier.ts
 * - State machine: idle (at station) → track (walking to enemy) → attack → die
 * - update(): combatLogic — find enemy → track → reach attack range → attack
 * - nonComLogic(): no enemies → return to station
 * - injure(damage): take damage, die if HP <= 0
 * - releaseSelf(): notify barrack to recycle
 *
 * Simplified from reference (no frame animations, single-frame visuals):
 * - Uses distance detection for combat (consistent with project style)
 * - Movement via tween/manual position update
 */
@ccclass('KR001Soldier')
export class KR001Soldier extends Component {

    // ─── Configuration ───
    private _maxHP: number = CommonConstant.SOLDIER_HP;
    private _currentHP: number = CommonConstant.SOLDIER_HP;
    private _moveSpeed: number = CommonConstant.SOLDIER_SPEED;
    private _attackRange: number = CommonConstant.SOLDIER_ATTACK_RANGE;
    private _investigateRange: number = CommonConstant.SOLDIER_INVESTIGATE_RANGE;
    private _attackDamage: number = CommonConstant.SOLDIER_ATTACK_DAMAGE;
    private _attackInterval: number = CommonConstant.SOLDIER_ATTACK_INTERVAL;

    // ─── State ───
    private _isAlive: boolean = true;
    private _isAttacking: boolean = false;
    private _isTracking: boolean = false;
    private _isReturning: boolean = false;
    private _canAttack: boolean = true;

    // ─── References ───
    private _stationNo: number = 0;
    private _stationPos: Vec3 = new Vec3();
    private _barrack: KR001BarrackTower | null = null;
    private _enemyRoot: Node | null = null;
    private _currentTarget: Node | null = null;

    /**
     * Initialize soldier with station and references.
     *
     * Reference: soldier.ts init(stationNo, station, level, barrack)
     */
    init(stationNo: number, stationPos: Vec3, barrack: KR001BarrackTower, enemyRoot: Node | null): void {
        this._stationNo = stationNo;
        this._stationPos.set(stationPos);
        this._barrack = barrack;
        this._enemyRoot = enemyRoot;

        this._currentHP = this._maxHP;
        this._isAlive = true;
        this._isAttacking = false;
        this._isTracking = false;
        this._isReturning = false;
        this._canAttack = true;
        this._currentTarget = null;
    }

    get stationNo(): number {
        return this._stationNo;
    }

    /**
     * Main AI loop — combat logic.
     *
     * Reference: soldier.ts uses CombatLogic which handles:
     * 1. Find nearest enemy in investigate range
     * 2. If found → track toward it
     * 3. If within attack range → attack
     * 4. If no enemy → return to station (nonComLogic)
     */
    update(dt: number): void {
        if (!this._isAlive || !this._enemyRoot) return;

        // Find nearest enemy in investigate range
        const myPos = this.node.getWorldPosition();
        let nearestEnemy: Node | null = null;
        let nearestDist = Infinity;

        const enemies = this._enemyRoot.children;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const controller = enemy.getComponent(KR001EnemyController);
            if (!controller || !controller.isAlive) continue;

            const dist = Vec3.distance(myPos, enemy.getWorldPosition());
            if (dist <= this._investigateRange && dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        if (nearestEnemy) {
            this._isReturning = false;
            this._currentTarget = nearestEnemy;

            if (nearestDist <= this._attackRange) {
                // In attack range → attack
                this.attackEnemy(nearestEnemy);
            } else {
                // Track toward enemy
                this.trackToward(nearestEnemy.getWorldPosition(), dt);
            }
        } else {
            // No enemy in range → return to station
            this._currentTarget = null;
            this.nonComLogic(dt);
        }
    }

    /**
     * Move toward a target position.
     *
     * Reference: soldier.ts track(pos) → walk(pos)
     */
    private trackToward(targetPos: Vec3, dt: number): void {
        this._isTracking = true;
        const myPos = this.node.getWorldPosition();
        const dx = targetPos.x - myPos.x;
        const dy = targetPos.y - myPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) return;

        const step = this._moveSpeed * dt;
        const ratio = Math.min(step / dist, 1);

        this.node.setWorldPosition(
            myPos.x + dx * ratio,
            myPos.y + dy * ratio,
            0
        );

        // Flip sprite based on direction
        // Reference: soldier.ts updateDir(des)
        if (dx < 0) {
            this.node.setScale(-1, 1, 1);
        } else if (dx > 0) {
            this.node.setScale(1, 1, 1);
        }
    }

    /**
     * Attack a nearby enemy.
     *
     * Reference: soldier.ts attack(m: Creature)
     * - if isAttacking return
     * - if !attackEnable return
     * - play attack animation → m.injure(aggressivity)
     * - cooldown
     */
    private attackEnemy(enemyNode: Node): void {
        if (this._isAttacking || !this._canAttack) return;

        this._isAttacking = true;
        this._canAttack = false;

        const controller = enemyNode.getComponent(KR001EnemyController);
        if (controller && controller.isAlive) {
            // Stop the enemy from moving (engage in combat)
            controller.engage();

            // Deal damage after a short delay (simulates attack animation)
            this.scheduleOnce(() => {
                if (controller && controller.isAlive && this._isAlive) {
                    controller.injure(this._attackDamage);
                }
                this._isAttacking = false;
            }, 0.3);
        } else {
            this._isAttacking = false;
        }

        // Attack cooldown
        // Reference: soldier.ts attackEnable = false → scheduleOnce → true
        this.scheduleOnce(() => {
            this._canAttack = true;
        }, this._attackInterval);
    }

    /**
     * Non-combat logic: return to station if not already there.
     *
     * Reference: soldier.ts nonComLogic()
     * - if inStation() return
     * - if isToStation return
     * - toStation()
     */
    private nonComLogic(dt: number): void {
        this._isTracking = false;

        const myPos = this.node.getWorldPosition();
        const dist = Vec3.distance(myPos, this._stationPos);

        if (dist < 2) {
            // Already at station
            this._isReturning = false;
            return;
        }

        // Walk back to station
        this._isReturning = true;
        this.trackToward(this._stationPos, dt);
    }

    /**
     * Receive damage.
     *
     * Reference: creature.ts injure(v)
     * - if cHP === 0 return
     * - cHP -= v; if cHP < 0 → cHP = 0
     * - refreshState() → if cHP === 0 → die
     */
    injure(damage: number): void {
        if (!this._isAlive || this._currentHP <= 0) return;

        this._currentHP -= damage;
        if (this._currentHP < 0) this._currentHP = 0;

        if (this._currentHP <= 0) {
            this.die();
        }
    }

    /**
     * Handle death.
     *
     * Reference: soldier.ts refreshState() → die → playDie → releaseSelf
     */
    private die(): void {
        this._isAlive = false;
        this._isAttacking = false;
        this._isTracking = false;

        log(`[KR001Soldier] Soldier at station ${this._stationNo} died`);

        // Disengage current target
        if (this._currentTarget && this._currentTarget.isValid) {
            const controller = this._currentTarget.getComponent(KR001EnemyController);
            if (controller) {
                controller.disengage();
            }
        }

        // Fade out and notify barrack
        // Reference: creature.ts playDie → fadeOut → releaseSelf
        let opacity = this.node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = this.node.addComponent(UIOpacity);
        }
        tween(opacity)
            .to(0.5, { opacity: 0 })
            .call(() => {
                this.releaseSelf();
            })
            .start();
    }

    /**
     * Notify barrack to recycle this soldier.
     *
     * Reference: soldier.ts releaseSelf() → barrack.releaseSoldier(this)
     */
    private releaseSelf(): void {
        if (this._barrack) {
            this._barrack.releaseSoldier(this);
        }
    }

    get isAlive(): boolean {
        return this._isAlive;
    }
}
