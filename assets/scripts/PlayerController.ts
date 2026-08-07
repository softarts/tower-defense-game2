import { _decorator, Component, Node, Vec3, input, Input, KeyCode, EventKeyboard, UITransform, Sprite, Color, SpriteFrame } from 'cc';
import { BulletController } from './BulletController';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ tooltip: '移动速度 (像素/秒)' })
    moveSpeed: number = 300;

    @property({ type: SpriteFrame, tooltip: '子弹使用的 SpriteFrame' })
    bulletSpriteFrame: SpriteFrame | null = null;

    private _keys: Set<number> = new Set();

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _onKeyDown(event: EventKeyboard) {
        this._keys.add(event.keyCode);
        if (event.keyCode === KeyCode.SPACE) {
            this._shoot();
        }
    }

    private _onKeyUp(event: EventKeyboard) {
        this._keys.delete(event.keyCode);
    }

    update(dt: number) {
        let dx = 0;
        let dy = 0;
        if (this._keys.has(KeyCode.KEY_A)) dx -= 1;
        if (this._keys.has(KeyCode.KEY_D)) dx += 1;
        if (this._keys.has(KeyCode.KEY_W)) dy += 1;
        if (this._keys.has(KeyCode.KEY_S)) dy -= 1;

        if (dx !== 0 || dy !== 0) {
            const pos = this.node.position;
            this.node.setPosition(new Vec3(
                pos.x + dx * this.moveSpeed * dt,
                pos.y + dy * this.moveSpeed * dt,
                pos.z
            ));
        }
    }

    private _shoot() {
        const bullet = new Node('Bullet');
        bullet.parent = this.node.parent;

        const pos = this.node.position;
        bullet.setPosition(new Vec3(pos.x, pos.y + 50, 0));

        const uiTransform = bullet.addComponent(UITransform);
        uiTransform.setContentSize(10, 20);

        const sprite = bullet.addComponent(Sprite);
        sprite.color = new Color(255, 255, 0, 255);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        // Use the same spriteFrame as the player if available
        if (this.bulletSpriteFrame) {
            sprite.spriteFrame = this.bulletSpriteFrame;
        } else {
            // Fallback: copy from player's own sprite
            const playerSprite = this.getComponent(Sprite);
            if (playerSprite && playerSprite.spriteFrame) {
                sprite.spriteFrame = playerSprite.spriteFrame;
            }
        }

        bullet.addComponent(BulletController);
    }
}
