import { _decorator, Component, Node, Vec2, Vec3, UITransform, UIOpacity, tween, log } from 'cc';
import { GameDataStorage } from './GameDataStorage';

const { ccclass, property } = _decorator;

/**
 * KR001EnemyController moves an enemy along a path AND handles HP/damage/death.
 *
 * Reference: kingdomRush-gxh1996
 * - creature.ts: injure(v), refreshBloodBar(), die(), cHP/maxHp
 * - monster.ts: refreshState() checks HP=0 → die → playDie → releaseSelf
 *
 * Cocos 3.x approach:
 * - ProgressBar child node "bloodBar" for HP display
 * - injure(v) called by bullet onBeginContact
 * - When HP <= 0: stop movement, fade out, destroy
 */
@ccclass('KR001EnemyController')
export class KR001EnemyController extends Component {

    @property({ tooltip: 'Movement speed (units/second)' })
    moveSpeed: number = 25;

    // ─── HP System (reference: creature.ts cHP/maxHp) ───
    private _maxHP: number = 30;
    private _currentHP: number = 30;
    private _isAlive: boolean = true;

    // ─── Blood Bar ───
    private _bloodBarNode: Node | null = null;
    private _hpBarNode: Node | null = null;
    private _hpBarTransform: UITransform | null = null;
    private _hpBarFullWidth: number = 20;

    // ─── Path Movement ───
    private _path: Vec2[] = [];
    private _currentIndex: number = 0;
    private _isMoving: boolean = false;

    public onReachedExit: (() => void) | null = null;
    public onDeath: (() => void) | null = null;

    /**
     * Initialize enemy with path and speed.
     * Also reads HP from GameDataStorage if available.
     */
    public init(path: Vec2[], speed?: number, monsterIndex: number = 0): void {
        if (!path || path.length < 2) {
            log('[KR001EnemyController] Invalid path');
            return;
        }

        this._path = path;
        this._currentIndex = 1;
        if (speed !== undefined) {
            this.moveSpeed = speed;
        }

        // Read HP from gameConfig (reference: monster.ts init → md.HP)
        if (GameDataStorage.isLoaded()) {
            const md = GameDataStorage.getGameConfig().getMonsterData();
            if (md && md[monsterIndex]) {
                this._maxHP = md[monsterIndex].HP;
            }
        }
        this._currentHP = this._maxHP;

        // Find blood bar child node (red bg + green hpBar child)
        this._bloodBarNode = this.node.getChildByName('bloodBar');
        if (this._bloodBarNode) {
            this._hpBarNode = this._bloodBarNode.getChildByName('hpBar');
            if (this._hpBarNode) {
                this._hpBarTransform = this._hpBarNode.getComponent(UITransform);
                if (this._hpBarTransform) {
                    this._hpBarFullWidth = this._hpBarTransform.width;
                }
            }
            // Initially hidden
            this._bloodBarNode.active = false;
        }

        // Place at first waypoint
        const start = path[0];
        this.node.setPosition(start.x, start.y, 0);
        this._isMoving = true;
        this._isAlive = true;
    }

    /**
     * Receive damage from a projectile.
     *
     * Reference: creature.ts injure(v)
     *   - if cHP === 0 return
     *   - cHP -= v; if cHP < 0 → cHP = 0
     *
     * Also shows and updates blood bar.
     */
    public injure(damage: number): void {
        if (!this._isAlive || this._currentHP <= 0) return;

        this._currentHP -= damage;
        if (this._currentHP < 0) this._currentHP = 0;

        // Show blood bar on first hit
        if (this._bloodBarNode && !this._bloodBarNode.active) {
            this._bloodBarNode.active = true;
        }

        // Update blood bar (reference: creature.ts refreshBloodBar)
        this.refreshBloodBar();

        // Check death (reference: monster.ts refreshState → if cHP === 0 → die)
        if (this._currentHP <= 0) {
            this.die();
        }
    }

    /**
     * Update blood bar: shrink green hpBar width over red background.
     * Full green = full HP, all red = dead.
     */
    private refreshBloodBar(): void {
        if (this._hpBarTransform) {
            const ratio = this._currentHP / this._maxHP;
            this._hpBarTransform.width = this._hpBarFullWidth * ratio;
        }
    }

    /**
     * Handle death.
     * Reference: monster.ts → die(monstersOfAlive, this) → playDie → releaseSelf
     * Simplified: stop movement → fade out → destroy
     */
    private die(): void {
        this._isAlive = false;
        this._isMoving = false;

        log(`[KR001EnemyController] Enemy died`);

        if (this.onDeath) {
            this.onDeath();
        }

        // Fade out and destroy (reference: creature.playDie → fadeOut(1) → destroy)
        let opacity = this.node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = this.node.addComponent(UIOpacity);
        }
        tween(opacity)
            .to(0.5, { opacity: 0 })
            .call(() => {
                this.node.destroy();
            })
            .start();
    }

    update(dt: number): void {
        if (!this._isMoving || !this._isAlive || this._isEngaged) return;

        if (this._currentIndex >= this._path.length) {
            this._isMoving = false;
            if (this.onReachedExit) {
                this.onReachedExit();
            }
            this.node.destroy();
            return;
        }

        const target = this._path[this._currentIndex];
        const pos = this.node.getPosition();
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const step = this.moveSpeed * dt;

        if (step >= distance) {
            this.node.setPosition(target.x, target.y, 0);
            this._currentIndex++;
        } else {
            const ratio = step / distance;
            this.node.setPosition(pos.x + dx * ratio, pos.y + dy * ratio, 0);
        }
    }

    // ─── Soldier Engagement (reference: monster.ts tracking/combat state) ───
    private _isEngaged: boolean = false;
    private _engageCount: number = 0;

    public get isAlive(): boolean {
        return this._isAlive;
    }

    public get isMoving(): boolean {
        return this._isMoving;
    }

    /**
     * Called by KR001Soldier when engaging this enemy in melee combat.
     * Stops the enemy from walking along its path.
     *
     * Reference: monster.ts — when soldier tracks and reaches attack range,
     * the monster stops moving and fights back.
     */
    public engage(): void {
        this._engageCount++;
        this._isEngaged = true;
    }

    /**
     * Called by KR001Soldier when disengaging (soldier dies or target changes).
     * Resumes walking if no other soldiers are engaging.
     */
    public disengage(): void {
        this._engageCount--;
        if (this._engageCount <= 0) {
            this._engageCount = 0;
            this._isEngaged = false;
        }
    }

    /**
     * Convenience method to get world position.
     * Reference: monster.ts getWPos()
     */
    public getWorldPos(): Vec3 {
        return this.node.getWorldPosition();
    }
}
