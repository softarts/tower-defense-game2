import { _decorator, Component, Sprite, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

/**
 * EnemyAnimator plays a sprite frame animation by cycling through
 * frames at a fixed FPS. Simpler and more reliable than using
 * AnimationClip ObjectTrack for sprite frame sequences.
 */
@ccclass('EnemyAnimator')
export class EnemyAnimator extends Component {

    @property({ tooltip: 'Animation frames per second' })
    fps: number = 12;

    /** Sprite frames to cycle through (set by EnemyFactory) */
    public frames: SpriteFrame[] = [];

    private _sprite: Sprite | null = null;
    private _timer: number = 0;
    private _frameIndex: number = 0;

    start(): void {
        this._sprite = this.getComponent(Sprite);
    }

    update(dt: number): void {
        if (!this._sprite || this.frames.length === 0) return;

        this._timer += dt;
        const frameDuration = 1 / this.fps;

        if (this._timer >= frameDuration) {
            this._timer -= frameDuration;
            this._frameIndex = (this._frameIndex + 1) % this.frames.length;
            this._sprite.spriteFrame = this.frames[this._frameIndex];
        }
    }
}
