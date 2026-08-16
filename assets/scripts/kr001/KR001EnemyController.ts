import { _decorator, Component, Vec2, log } from 'cc';

const { ccclass, property } = _decorator;

/**
 * KR001EnemyController moves an enemy along a pre-sampled waypoint path.
 * 
 * Responsibilities:
 * - Receive path (Vec2[]) and speed
 * - Move smoothly between waypoints each frame
 * - Destroy self upon reaching the final waypoint
 * 
 * This component does NOT handle:
 * - HP / damage / death (reserved for Task002)
 * - Attack / combat
 * - Animation (handled separately)
 */
@ccclass('KR001EnemyController')
export class KR001EnemyController extends Component {

    /** Movement speed in units per second */
    @property({ tooltip: 'Movement speed (units/second)' })
    moveSpeed: number = 25;

    /** Waypoints in node-local coordinates (Vec2, same space as parent node) */
    private _path: Vec2[] = [];

    /** Current target waypoint index */
    private _currentIndex: number = 0;

    /** Whether currently moving */
    private _isMoving: boolean = false;

    /** Callback when enemy reaches the final waypoint (exit) */
    public onReachedExit: (() => void) | null = null;

    /**
     * Initialize enemy with path and optional speed.
     * Places the enemy at the first waypoint and begins movement.
     * 
     * @param path - Array of Vec2 waypoints in parent-local coordinates
     * @param speed - Optional movement speed override
     */
    public init(path: Vec2[], speed?: number): void {
        if (!path || path.length < 2) {
            log('[KR001EnemyController] Invalid path (need at least 2 points)');
            return;
        }

        this._path = path;
        this._currentIndex = 1; // Start moving toward second point
        if (speed !== undefined) {
            this.moveSpeed = speed;
        }

        // Place at first waypoint
        const start = path[0];
        this.node.setPosition(start.x, start.y, 0);
        this._isMoving = true;
    }

    update(dt: number): void {
        if (!this._isMoving || this._path.length === 0) {
            return;
        }

        if (this._currentIndex >= this._path.length) {
            this._isMoving = false;
            log('[KR001EnemyController] Reached exit');
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
            // Arrived at waypoint — snap and advance
            this.node.setPosition(target.x, target.y, 0);
            this._currentIndex++;
        } else {
            // Move toward target
            const ratio = step / distance;
            this.node.setPosition(pos.x + dx * ratio, pos.y + dy * ratio, 0);
        }
    }

    /** Check if enemy is still alive and moving */
    public get isMoving(): boolean {
        return this._isMoving;
    }
}
