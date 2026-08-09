import {
    _decorator, Component, Node, Vec3, Graphics, Color,
    Label, UITransform, Size, log, error
} from 'cc';
import { MapLoader, LevelData, BuildSpotData, WaypointData } from './MapLoader';

const { ccclass, property } = _decorator;

@ccclass('MapDebug')
export class MapDebug extends Component {

    /** Reference to the MapLoader component (assign in Inspector or auto-find) */
    @property({ type: MapLoader, tooltip: 'MapLoader component reference' })
    mapLoader: MapLoader | null = null;

    /** Color for path lines */
    @property({ tooltip: 'Path line color (hex without #)' })
    pathColorHex: string = 'FF4444';

    /** Color for build spot markers */
    @property({ tooltip: 'Build spot marker color (hex without #)' })
    spotColorHex: string = '44FF44';

    /** Color for waypoint markers */
    @property({ tooltip: 'Waypoint marker color (hex without #)' })
    waypointColorHex: string = 'FFFF00';

    /** Radius for build spot circles */
    @property({ tooltip: 'Build spot marker radius' })
    spotRadius: number = 16;

    /** Radius for waypoint circles */
    @property({ tooltip: 'Waypoint marker radius' })
    waypointRadius: number = 6;

    /** Path line width */
    @property({ tooltip: 'Path line width' })
    pathLineWidth: number = 3;

    private _graphics: Graphics | null = null;
    private _labelNodes: Node[] = [];

    start() {
        // Find MapLoader if not assigned
        if (!this.mapLoader) {
            this.mapLoader = this.node.parent?.getComponentInChildren(MapLoader) || null;
        }

        if (!this.mapLoader) {
            error('[MapDebug] MapLoader not found');
            return;
        }

        // Get or add Graphics component
        this._graphics = this.getComponent(Graphics);
        if (!this._graphics) {
            this._graphics = this.addComponent(Graphics);
        }

        // Register callback for when map data is ready
        this.mapLoader.onMapLoaded = (data: LevelData) => {
            this.drawDebugOverlay(data);
        };

        // If map data is already loaded (in case MapDebug starts after MapLoader)
        if (this.mapLoader.levelData) {
            this.drawDebugOverlay(this.mapLoader.levelData);
        }
    }

    private drawDebugOverlay(data: LevelData) {
        log('[MapDebug] Drawing debug overlay...');

        if (!this._graphics || !this.mapLoader) {
            error('[MapDebug] Graphics or MapLoader not available');
            return;
        }

        this._graphics.clear();
        this.clearLabels();

        // Draw path
        this.drawPath(data.path.waypoints);

        // Draw waypoint markers
        this.drawWaypoints(data.path.waypoints);

        // Draw build spots
        this.drawBuildSpots(data.buildSpots);

        log(`[MapDebug] Debug overlay complete: ${data.buildSpots.length} spots, ${data.path.waypoints.length} waypoints`);
    }

    private drawPath(waypoints: WaypointData[]) {
        if (!this._graphics || !this.mapLoader || waypoints.length < 2) return;

        const pathColor = this.hexToColor(this.pathColorHex);
        this._graphics.strokeColor = pathColor;
        this._graphics.lineWidth = this.pathLineWidth;

        const startPos = this.mapLoader.imageToCocosPosition(waypoints[0].x, waypoints[0].y);
        this._graphics.moveTo(startPos.x, startPos.y);

        for (let i = 1; i < waypoints.length; i++) {
            const pos = this.mapLoader.imageToCocosPosition(waypoints[i].x, waypoints[i].y);
            this._graphics.lineTo(pos.x, pos.y);
        }

        this._graphics.stroke();
        log(`[MapDebug] Path drawn: ${waypoints.length} segments`);
    }

    private drawWaypoints(waypoints: WaypointData[]) {
        if (!this._graphics || !this.mapLoader) return;

        const wpColor = this.hexToColor(this.waypointColorHex);
        this._graphics.fillColor = wpColor;

        for (let i = 0; i < waypoints.length; i++) {
            const pos = this.mapLoader.imageToCocosPosition(waypoints[i].x, waypoints[i].y);
            this._graphics.circle(pos.x, pos.y, this.waypointRadius);
            this._graphics.fill();
        }
    }

    private drawBuildSpots(buildSpots: BuildSpotData[]) {
        if (!this._graphics || !this.mapLoader) return;

        const spotColor = this.hexToColor(this.spotColorHex);

        for (const spot of buildSpots) {
            const pos = this.mapLoader.imageToCocosPosition(spot.x, spot.y);

            // Draw circle marker
            this._graphics.strokeColor = spotColor;
            this._graphics.lineWidth = 2;
            this._graphics.circle(pos.x, pos.y, this.spotRadius);
            this._graphics.stroke();

            // Draw cross inside
            const half = this.spotRadius * 0.5;
            this._graphics.moveTo(pos.x - half, pos.y);
            this._graphics.lineTo(pos.x + half, pos.y);
            this._graphics.stroke();
            this._graphics.moveTo(pos.x, pos.y - half);
            this._graphics.lineTo(pos.x, pos.y + half);
            this._graphics.stroke();

            // Create label for ID
            this.createSpotLabel(spot.id, pos);
        }

        log(`[MapDebug] Build spots drawn: ${buildSpots.length}`);
    }

    private createSpotLabel(id: string, position: Vec3) {
        const labelNode = new Node(`Label_${id}`);
        labelNode.setParent(this.node);
        // Position label above the marker
        labelNode.setPosition(position.x, position.y + this.spotRadius + 10, 0);

        const uiTransform = labelNode.addComponent(UITransform);
        uiTransform.setContentSize(new Size(60, 20));

        const label = labelNode.addComponent(Label);
        label.string = id;
        label.fontSize = 14;
        label.color = this.hexToColor(this.spotColorHex);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.NONE;

        this._labelNodes.push(labelNode);
    }

    private clearLabels() {
        for (const node of this._labelNodes) {
            node.destroy();
        }
        this._labelNodes = [];
    }

    private hexToColor(hex: string): Color {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return new Color(r, g, b, 255);
    }

    onDestroy() {
        this.clearLabels();
    }
}
