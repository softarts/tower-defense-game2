import { _decorator, Component, Node, Prefab, resources, log } from 'cc';
import { CommonConstant } from '../CommonConstant';
import { KR001Arrower } from './KR001Arrower';

const { ccclass, property } = _decorator;

/**
 * KR001ArrowTower manages the arrow tower.
 *
 * Reference: kingdomRush-gxh1996 arrowTower.ts
 * - Manages bullet prefab pool (simplified: just holds prefab reference)
 * - Finds leftPerson / rightPerson child nodes
 * - Initializes each with a KR001Arrower component that handles independent shooting
 * - The tower itself does NOT shoot; each arrower has its own update() loop
 *
 * Architecture (mirrors reference):
 *   arrowTower.ts  →  manages pool, levels, skin
 *   arrower.ts     →  each archer independently: update → detect → shoot → cooldown
 *   arrowBullet.ts →  bullet flight + rotation + fade
 */
@ccclass('KR001ArrowTower')
export class KR001ArrowTower extends Component {

    private _bulletPrefab: Prefab | null = null;
    private _leftArrower: KR001Arrower | null = null;
    private _rightArrower: KR001Arrower | null = null;

    onLoad(): void {
        // Load the arrow bullet prefab
        resources.load(CommonConstant.PREFAB_ARROW_BULLET, Prefab, (err, prefab) => {
            if (err) {
                log(`[KR001ArrowTower] Failed to load arrow bullet prefab: ${err.message}`);
                return;
            }
            this._bulletPrefab = prefab;

            // Initialize arrowers after prefab is loaded
            this.initArrowers();
        });
    }

    /**
     * Add KR001Arrower component to leftPerson and rightPerson.
     * Reference: arrowTower.ts onLoad() gets the two arrower components.
     * We add them dynamically since the prefab doesn't have the script pre-attached.
     */
    private initArrowers(): void {
        const left = this.node.getChildByName('leftPerson');
        const right = this.node.getChildByName('rightPerson');

        if (left) {
            this._leftArrower = left.addComponent(KR001Arrower);
            this._leftArrower.init(this, CommonConstant.ARROW_SHOOT_RANGE,
                CommonConstant.ARROW_BULLET_SPEED, CommonConstant.ARROW_COOLDOWN);
        }

        if (right) {
            this._rightArrower = right.addComponent(KR001Arrower);
            this._rightArrower.init(this, CommonConstant.ARROW_SHOOT_RANGE,
                CommonConstant.ARROW_BULLET_SPEED, CommonConstant.ARROW_COOLDOWN);
        }

        log('[KR001ArrowTower] Arrowers initialized');
    }

    /**
     * Get the bullet prefab (called by KR001Arrower to create bullets).
     * Reference: arrowTower.ts getArrowBullet() — returns node from pool.
     */
    getBulletPrefab(): Prefab | null {
        return this._bulletPrefab;
    }
}
