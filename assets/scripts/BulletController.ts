import { _decorator, Component, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BulletController')
export class BulletController extends Component {
    @property({ tooltip: '子弹飞行速度 (像素/秒)' })
    speed: number = 600;

    @property({ tooltip: '超过此 Y 坐标自动销毁' })
    destroyY: number = 720;

    update(dt: number) {
        const pos = this.node.position;
        const newY = pos.y + this.speed * dt;
        if (newY > this.destroyY) {
            this.node.destroy();
            return;
        }
        this.node.setPosition(new Vec3(pos.x, newY, pos.z));
    }
}
