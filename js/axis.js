import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// =========================
// Constants
// =========================
const GRAPH_X_MIN = -100;
const GRAPH_X_MAX = 100;
const GRAPH_Y_MIN = -100;
const GRAPH_Y_MAX = 100;

const AUDIOGRAM_FREQ_MIN = 125;
const AUDIOGRAM_FREQ_MAX = 8000;

const MIC_FREQ_MIN = 125;
const MIC_FREQ_MAX = 6000;

const AUDIOGRAM_FREQ_TICKS = [
    250, 500, 1000, 2000, 3000, 4000, 6000, 8000
];

const REALTIME_FREQ_TICKS = [
    125, 250,
    500, 625, 750,
    1000, 1250, 1400, 1500, 1700, 1850,
    2000, 2300, 2600,
    3000, 3500,
    4000, 4500, 5000, 6000
];

const splRefs = {
    50:  'quiet office',
    60:  'normal room',
    70:  'conversation',
    80:  'busy street',
    90:  'loud traffic',
    100: 'shouting',
    110: 'pain threshold',
    120: 'jet engine'
};

let staticObjects = [];

// =========================
// Frequency ticks
// =========================
function getFreqTicks(mode) {
    if (mode === 'audiogram') {
        return AUDIOGRAM_FREQ_TICKS;
    }

    return REALTIME_FREQ_TICKS;
}

function shouldDrawRealtimeTick(index, length) {
    if (index === 0) {
        return true;
    }

    if (index === length - 1) {
        return true;
    }

    if (index % 4 === 0) {
        return true;
    }

    return false;
}

// =========================
// Static line drawing
// =========================
function toVector3(coordinate) {
    const x = coordinate[0];
    const y = coordinate[1];

    return new THREE.Vector3(x, y, 0);
}

export function createLine(points, material) {
    const vectors = points.map(toVector3);

    /* COMMENTS
        Create geometry objects to load coordinates on GPU
        Like Vertex Buffer in C++
    */
    const geometry = new THREE.BufferGeometry().setFromPoints(vectors);

    // Draw a Line (combined geometry + material(color/style))
    return new THREE.Line(geometry, material);
}

export function addStatic(scene, obj) {
    scene.add(obj);
    staticObjects.push(obj);
}

export function clearStatic(scene) {
    staticObjects.forEach(obj => scene.remove(obj));
    staticObjects = [];
}

// =========================
// Grid / Axes
// =========================
export function createGrid(scene, dbMin, dbMax, dbStep, mapY, mode = 'audiogram') {
    const gridMat = new THREE.LineBasicMaterial({ color: 0xbbbbbb });
    const boxMat = new THREE.LineBasicMaterial({ color: 0x444444 });
    const freqTicks = getFreqTicks(mode);

    freqTicks.forEach((freq, index) => {
        if (mode !== 'audiogram') {
            const shouldDraw = shouldDrawRealtimeTick(index, freqTicks.length);

            if (!shouldDraw) {
                return;
            }
        }

        const x = mapLog(freq, mode);

        addStatic(
            scene,
            createLine([[x, GRAPH_Y_MIN], [x, GRAPH_Y_MAX]], gridMat)
        );
    });

    for (let db = dbMin; db <= dbMax; db += dbStep) {
        const y = mapY(db);

        addStatic(
            scene,
            createLine([[GRAPH_X_MIN, y], [GRAPH_X_MAX, y]], gridMat)
        );
    }

    addStatic(
        scene,
        createLine([
            [GRAPH_X_MIN, GRAPH_Y_MAX], [GRAPH_X_MAX, GRAPH_Y_MAX],
            [GRAPH_X_MAX, GRAPH_Y_MIN], [GRAPH_X_MIN, GRAPH_Y_MIN],
            [GRAPH_X_MIN, GRAPH_Y_MAX]
        ], boxMat)
    );
}

export function drawStaticLine(scene, data, color, dashed = false, mode = 'audiogram') {
    const points = data.map(d => {
        return new THREE.Vector3(mapLog(d.freq, mode), d.y, 0);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    let material = null;

    if (dashed) {
        material = new THREE.LineDashedMaterial({
            color: color,
            dashSize: 3,
            gapSize: 2
        });
    } else {
        material = new THREE.LineBasicMaterial({ color: color });
    }

    const line = new THREE.Line(geometry, material);

    if (dashed) {
        line.computeLineDistances();
    }

    addStatic(scene, line);
}

// =========================
// Mapping
// =========================
function mapValue(val, inMin, inMax, outMin, outMax) {
    return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function mapLogRange(freq, minFreq, maxFreq) {
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    const valLog = Math.log10(Math.max(freq, minFreq));

    return (valLog - minLog) / (maxLog - minLog) * 200 - 100;
}

export function mapHL(hl, dbMin = -10, dbMax = 120) {
    return mapValue(hl, dbMin, dbMax, GRAPH_Y_MAX, GRAPH_Y_MIN);
}

export function mapSPL(spl, splMin = 50, splMax = 135) {
    return mapValue(spl, splMin, splMax, GRAPH_Y_MIN, GRAPH_Y_MAX);
}

export function mapLog(freq, mode = 'audiogram') {
    const freqTicks = getFreqTicks(mode);
    const index = freqTicks.indexOf(freq);

    if (index === -1) {
        return GRAPH_X_MIN;
    }

    if (freqTicks.length === 1) {
        return 0;
    }

    return index / (freqTicks.length - 1) * 200 - 100;
}

export function mapMicLog(freq) {
    return mapLogRange(freq, MIC_FREQ_MIN, MIC_FREQ_MAX);
}

export function mapWavLevel(level, minLevel = -100, maxLevel = 0) {
    return mapValue(level, minLevel, maxLevel, GRAPH_Y_MIN, GRAPH_Y_MAX);
}

// =========================
// Axis labels
// =========================
/*function screenX(graphX, renderer) {
    const rect = renderer.domElement.getBoundingClientRect();
    const aspect = rect.width / rect.height;

    return window.scrollX + rect.left
        + (graphX + 125 * aspect) / (250 * aspect) * rect.width;
}

function screenY(graphY, renderer) {
    const rect = renderer.domElement.getBoundingClientRect();

    return window.scrollY + rect.top
        + (125 - graphY) / 250 * rect.height;
}*/

function screenX(graphX, renderer) {
    const canvasRect = renderer.domElement.getBoundingClientRect();
    const container = document.getElementById('axis-labels');
    const containerRect = container.getBoundingClientRect();

    const aspect = canvasRect.width / canvasRect.height;

    return (canvasRect.left - containerRect.left)
        + (graphX + 125 * aspect) / (250 * aspect) * canvasRect.width;
}

function screenY(graphY, renderer) {
    const canvasRect = renderer.domElement.getBoundingClientRect();
    const container = document.getElementById('axis-labels');
    const containerRect = container.getBoundingClientRect();

    return (canvasRect.top - containerRect.top)
        + (125 - graphY) / 250 * canvasRect.height;
}

export function updateAxisLabels(renderer, mode = 'audiogram') {
    const container = document.getElementById('axis-labels');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    const isAudiogram = mode === 'audiogram';
    const isWav = mode === 'wav';

    const dbMin = isAudiogram ? -10 : (isWav ? -100 : 50)
    const dbMax = isAudiogram ? 120 : (isWav ? 0 : 135);

    const unit = isAudiogram
                ? ' dB HL'
                : (isWav ? 'dBFS' : ' dB SPL');
    const mapY = isAudiogram
                ? mapHL
                : (isWav ? mapWavLevel : mapSPL);

    const freqTicks = getFreqTicks(mode);

    const axisBottom = screenY(GRAPH_Y_MIN, renderer);

    for (let db = dbMin; db <= dbMax; db += 10) {
        const y = screenY(mapY(db), renderer);
        const ref = (!isAudiogram && !isWav && splRefs[db]) ? ' — ' + splRefs[db] : '';

        const el = document.createElement('div');
        el.className = 'axis-tick y-tick';
        el.textContent = db + unit + ref;
        el.style.top = y + 'px';
        el.style.left = '8px';
        el.style.transform = 'translateY(-50%)';

        container.appendChild(el);
    }

    freqTicks.forEach((freq, index) => {
        if (!isAudiogram) {
            const shouldDraw = shouldDrawRealtimeTick(index, freqTicks.length);

            if (!shouldDraw) {
                return;
            }
        }

        const x = screenX(mapLog(freq, mode), renderer);

        const el = document.createElement('div');
        el.className = 'axis-tick x-tick';
        el.textContent = freq >= 1000 ? (freq / 1000) + 'k' : freq;
        el.style.left = x + 'px';
        el.style.top = (axisBottom + 10) + 'px'; // Numbers of the freq

        container.appendChild(el);
    });

    const title = document.createElement('div');
    title.className = 'axis-tick';
    title.textContent = 'Frequency (Hz)';
    title.style.left = screenX(GRAPH_X_MAX, renderer) + 'px';
    title.style.top = (axisBottom + 30) + 'px';
    title.style.transform = 'translateX(-100%)';

    container.appendChild(title);
}