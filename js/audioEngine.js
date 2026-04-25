import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { mapMicLog, mapSPL, mapWavLevel } from './axis.js';
import { stopMicrophone } from './micEngine.js';
import { stopWavPlayback } from './wavEngine.js';

let audioCtx = null;
let analyser = null;
let dataArray = null;
let micLine = null;

const FFT_SIZE = 32768;
const MIC_OFFSET = 113.6;
const NOISE_FLOOR = -100;

const FREQ_MIN = 125;
const FREQ_MAX = 6000;
const SPL_MIN = 50;
const SPL_MAX = 135;


// =========================
// Audio context / analyser
// =========================
export function ensureAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.3;
        analyser.minDecibels = -100;
        analyser.maxDecibels = -10;

        dataArray = new Float32Array(analyser.frequencyBinCount);
    }

    return { audioCtx, analyser, dataArray };
}

export function getAudioContext() {
    return audioCtx;
}

export function getAnalyser() {
    return analyser;
}

export function getDataArray() {
    return dataArray;
}

export function closeAudioEngine() {
    if (audioCtx) {
        audioCtx.close();
    }

    audioCtx = null;
    analyser = null;
    dataArray = null;
}


// =========================
// Mic line
// =========================
export function ensureMicLine(scene) {
    if (!micLine) {
        micLine = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x0055ff })
        );
        micLine.frustumCulled = false;
    }

    if (scene && !scene.children.includes(micLine)) {
        scene.add(micLine);
    }
}

export function hideMicLine() {
    if (micLine) {
        micLine.visible = false;
    }
}

export function updateAudioLine(scene, mode = 'realtime') {
    if (!audioCtx || !analyser || !dataArray) {
        return;
    }

    ensureMicLine(scene);

    analyser.getFloatFrequencyData(dataArray);

    const sampleRate = audioCtx.sampleRate;
    const binStep = sampleRate / FFT_SIZE;
    const points = [];

    for (let freq = FREQ_MIN; freq <= FREQ_MAX; freq += 1) {
        const binIndex = freq / binStep;

        const i0 = Math.floor(binIndex);
        const i1 = Math.min(i0 + 1, dataArray.length - 1);
        const frac = binIndex - i0;

        if (i0 < 0 || i0 >= dataArray.length) {
            continue;
        }

        const db0 = dataArray[i0];
        const db1 = dataArray[i1];
        const interpDb = db0 + (db1 - db0) * frac;

        if (interpDb < NOISE_FLOOR) {
            continue;
        }

        let y = 0;

        if (mode === 'wav') {
            y = mapWavLevel(interpDb);
        } else {
            const spl = Math.max(
                SPL_MIN,
                Math.min(SPL_MAX, interpDb + MIC_OFFSET)
            );

            y = mapSPL(spl);
        }

        points.push(
            new THREE.Vector3(mapMicLog(freq), y, 0)
        );
    }

    if (points.length > 1) {
        micLine.geometry.setFromPoints(points);
        micLine.visible = true;
    } else {
        micLine.visible = false;
    }
}


// =========================
// Stop wav playback
// =========================

export function stopAllAudio() {
    stopMicrophone();
    stopWavPlayback();
    closeAudioEngine();
}

// =========================
// Alert on the WAV panel
// =========================
export function getCurrentAudioFeature() {
    if (!audioCtx || !analyser || !dataArray) {
        return null;
    }

    analyser.getFloatFrequencyData(dataArray);

    const sampleRate = audioCtx.sampleRate;
    const binStep = sampleRate / FFT_SIZE;

    let sumAmp = 0;
    let weightedFreq = 0;
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let zcrLike = 0;

    const amps = [];

    for (let i = 0; i < dataArray.length; i++) {
        const db = dataArray[i];

        if (!Number.isFinite(db) || db <= NOISE_FLOOR) {
            amps.push(0);
            continue;
        }

        const freq = i * binStep;
        const amp = Math.pow(10, db / 20);

        amps.push(amp);
        sumAmp += amp;
        weightedFreq += freq * amp;

        if (freq >= 125 && freq < 500) {
            lowEnergy += amp;
        } else if (freq >= 500 && freq < 3000) {
            midEnergy += amp;
        } else if (freq >= 3000 && freq <= 6000) {
            highEnergy += amp;
        }
    }

    let rolloffFreq = 0;
    let cumulative = 0;
    const rolloffTarget = sumAmp * 0.85;

    for (let i = 1; i < amps.length; i++) {
        cumulative += amps[i];

        if (rolloffFreq === 0 && cumulative >= rolloffTarget) {
            rolloffFreq = i * binStep;
        }

        if ((amps[i] > 0) !== (amps[i - 1] > 0)) {
            zcrLike += 1;
        }
    }

    const totalBand = lowEnergy + midEnergy + highEnergy + 1e-8;

    const rms = Math.sqrt(
        amps.reduce((acc, v) => acc + v * v, 0) / Math.max(amps.length, 1)
    );

    const centroid = sumAmp > 0 ? weightedFreq / sumAmp : 0;
    const zcr = zcrLike / Math.max(amps.length, 1);

    return {
        rms: Number(rms.toFixed(6)),
        centroid: Number(centroid.toFixed(2)),
        zcr: Number(zcr.toFixed(6)),
        rolloff: Number(rolloffFreq.toFixed(2)),
        band_low: Number((lowEnergy / totalBand).toFixed(6)),
        band_mid: Number((midEnergy / totalBand).toFixed(6)),
        band_high: Number((highEnergy / totalBand).toFixed(6))
    };
}