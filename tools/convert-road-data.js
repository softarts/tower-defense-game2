/**
 * Convert roadData.anim bezier curves to sampled waypoints.
 * 
 * Algorithm matches the reference project's animationPath.ts:
 * - Parse motionPath control points from roadData.anim
 * - Build cubic bezier segments
 * - Sample each segment every SAMPLE_DISTANCE pixels
 * - Output road1.json with waypoint array
 * 
 * Usage: node tools/convert-road-data.js
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_DISTANCE = 16; // pixels between waypoints (matches reference project)

// --- Bezier math ---

function bezier(v1, v2, v3, v4, t) {
    return v1 * Math.pow(1 - t, 3) +
           3 * v2 * t * Math.pow(1 - t, 2) +
           3 * v3 * t * t * (1 - t) +
           v4 * Math.pow(t, 3);
}

function getBezierLength(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY, subdivisions = 20) {
    let length = 0;
    let lastX = startX;
    let lastY = startY;
    const step = 1 / subdivisions;
    
    for (let t = step; t <= 1.0001; t += step) {
        const x = bezier(startX, cp1X, cp2X, endX, Math.min(t, 1));
        const y = bezier(startY, cp1Y, cp2Y, endY, Math.min(t, 1));
        const dx = x - lastX;
        const dy = y - lastY;
        length += Math.sqrt(dx * dx + dy * dy);
        lastX = x;
        lastY = y;
    }
    return length;
}

function sampleBezierSegment(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY, sampleDist) {
    const length = getBezierLength(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY);
    const numPoints = Math.floor(length / sampleDist);
    if (numPoints <= 0) return [{ x: endX, y: endY }];
    
    const points = [];
    const step = 1 / numPoints;
    
    for (let t = step; t <= 1; t += step) {
        const x = bezier(startX, cp1X, cp2X, endX, t);
        const y = bezier(startY, cp1Y, cp2Y, endY, t);
        points.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
    }
    
    // Ensure end point is included
    const last = points[points.length - 1];
    if (!last || Math.abs(last.x - endX) > 0.5 || Math.abs(last.y - endY) > 0.5) {
        points.push({ x: endX, y: endY });
    }
    
    return points;
}

// --- Parse roadData.anim ---

/**
 * Extract bezier segments from two keyframes (matching reference project logic).
 * 
 * motionPath format: [x, y, inControlX, inControlY, outControlX, outControlY]
 * 
 * First segment: startKeyFrame.value -> first motionPath point
 *   startP = startKeyFrame.value
 *   cP1 = cP2 = motionPath[0].inControl (indices 2,3)
 *   endP = motionPath[0].position (indices 0,1)
 * 
 * Middle segments: motionPath[i] -> motionPath[i+1]
 *   startP = motionPath[i].position (indices 0,1)
 *   cP1 = motionPath[i].outControl (indices 4,5)
 *   cP2 = motionPath[i+1].inControl (indices 2,3)
 *   endP = motionPath[i+1].position (indices 0,1)
 * 
 * Last segment: last motionPath -> endKeyFrame.value
 *   startP = motionPath[last].position (indices 0,1)
 *   cP1 = cP2 = motionPath[last].outControl (indices 4,5)
 *   endP = endKeyFrame.value
 */
function createBezierSegments(startKeyFrame, endKeyFrame) {
    const segments = [];
    const motionPath = startKeyFrame.motionPath;
    
    if (!motionPath || motionPath.length === 0) {
        // No motion path - straight line
        return [{
            startX: startKeyFrame.value[0], startY: startKeyFrame.value[1],
            cp1X: startKeyFrame.value[0], cp1Y: startKeyFrame.value[1],
            cp2X: endKeyFrame.value[0], cp2Y: endKeyFrame.value[1],
            endX: endKeyFrame.value[0], endY: endKeyFrame.value[1]
        }];
    }
    
    // First segment: start value -> first motionPath point
    const firstMP = motionPath[0];
    segments.push({
        startX: startKeyFrame.value[0],
        startY: startKeyFrame.value[1],
        cp1X: firstMP[2],  // inControl of first motionPath point
        cp1Y: firstMP[3],
        cp2X: firstMP[2],  // same (degenerate cubic)
        cp2Y: firstMP[3],
        endX: firstMP[0],
        endY: firstMP[1]
    });
    
    // Middle segments: motionPath[i] -> motionPath[i+1]
    for (let i = 0; i < motionPath.length - 1; i++) {
        const mpStart = motionPath[i];
        const mpEnd = motionPath[i + 1];
        segments.push({
            startX: mpStart[0],
            startY: mpStart[1],
            cp1X: mpStart[4],  // outControl of start
            cp1Y: mpStart[5],
            cp2X: mpEnd[2],    // inControl of end
            cp2Y: mpEnd[3],
            endX: mpEnd[0],
            endY: mpEnd[1]
        });
    }
    
    // Last segment: last motionPath -> end value
    const lastMP = motionPath[motionPath.length - 1];
    segments.push({
        startX: lastMP[0],
        startY: lastMP[1],
        cp1X: lastMP[4],  // outControl of last motionPath
        cp1Y: lastMP[5],
        cp2X: lastMP[4],  // same (degenerate cubic)
        cp2Y: lastMP[5],
        endX: endKeyFrame.value[0],
        endY: endKeyFrame.value[1]
    });
    
    return segments;
}

function extractPath(roadName, roadData) {
    const frames = roadData.props.position;
    if (!frames || frames.length < 2) {
        console.error(`Road ${roadName}: needs at least 2 keyframes`);
        return null;
    }
    
    // Collect all bezier segments from consecutive keyframe pairs
    let allSegments = [];
    for (let i = 0; i < frames.length - 1; i++) {
        const segments = createBezierSegments(frames[i], frames[i + 1]);
        allSegments = allSegments.concat(segments);
    }
    
    // Sample all segments
    // Start with the first keyframe's position
    const points = [{ 
        x: frames[0].value[0], 
        y: frames[0].value[1] 
    }];
    
    for (const seg of allSegments) {
        const sampled = sampleBezierSegment(
            seg.startX, seg.startY,
            seg.cp1X, seg.cp1Y,
            seg.cp2X, seg.cp2Y,
            seg.endX, seg.endY,
            SAMPLE_DISTANCE
        );
        // sampled doesn't include startP (it starts from t=step)
        points.push(...sampled);
    }
    
    return points;
}

// --- Main ---

const roadDataPath = path.join(__dirname, '..', 'assets', 'resources', 'level1', 'roadData.anim');
const outputDir = path.join(__dirname, '..', 'assets', 'resources', 'level1');

console.log('Reading roadData.anim...');
const rawData = fs.readFileSync(roadDataPath, 'utf-8');
const animData = JSON.parse(rawData);

const roads = animData.curveData.paths;

for (const roadName of Object.keys(roads)) {
    console.log(`\nProcessing ${roadName}...`);
    const points = extractPath(roadName, roads[roadName]);
    
    if (points) {
        const output = {
            name: roadName,
            sampleDistance: SAMPLE_DISTANCE,
            coordinateSystem: "cocos-local",
            description: "Sampled from roadData.anim bezier curves. Coordinates are in node-local space (origin center, Y up).",
            points: points
        };
        
        const outputPath = path.join(outputDir, `${roadName}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`  ${points.length} waypoints -> ${roadName}.json`);
        console.log(`  Start: (${points[0].x}, ${points[0].y})`);
        console.log(`  End:   (${points[points.length-1].x}, ${points[points.length-1].y})`);
    }
}

console.log('\nDone!');
