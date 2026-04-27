import { playHapticAlert } from './hapticEngine.js';
import { recordAlertEvent } from './experiment.js';


let smoothedScore = 0;

const ALPHA = 0.35;
const ALERT_HOLD_MS = 1200;

const alertState = {
    currentLevel: 'none',
    displayLevel: 'none',
    startTimeMs: 0,
    startWavSec: 0,
    holdUntilMs: 0
};


// =========================
// Wav Alert
// =========================
export async function requestWavAnalysis(file) {
    const res = await fetch('/api/analyze-wav.json');

    if (!res.ok) {
        throw new Error(`WAV analysis failed: ${res.status}`);
    }

    const data = await res.json();

    if (data[file.name]) {
        return data[file.name];
    }

    return { segments: [] };
}

export function findCurrentSegment(timeline, currentTime) {
    if (!timeline || !timeline.segments) {
        return null;
    }

    return timeline.segments.find(seg =>
        currentTime >= seg.start && currentTime < seg.end
    ) || null;
}

export function updateWavAlert(currentMode, result, getWavInfo) {
    const wavAlert = document.getElementById('wavAlert');
    if (!wavAlert) return 'none';

    if (currentMode !== 'wav') {
        wavAlert.textContent = '';
        wavAlert.style.display = 'none';

        alertState.currentLevel = 'none';
        alertState.displayLevel = 'none';
        return 'none';
    }

    wavAlert.style.display = '';

    const score = result && result.score != null ? result.score : 0;
    const rawLevel = getAlertLevelFromScore(score);
    const nowMs = performance.now();
    const wavInfo = getWavInfo ? getWavInfo() : null;

    if (
        rawLevel !== 'none' &&
        rawLevel !== alertState.currentLevel &&
        nowMs > alertState.holdUntilMs
    ) {
        startAlert(rawLevel, wavInfo, getWavInfo);
    }

    if (nowMs > alertState.holdUntilMs && rawLevel === 'none') {
        alertState.currentLevel = 'none';
        alertState.displayLevel = 'none';
    }

    const displayLevel = alertState.displayLevel;

    if (displayLevel === 'danger') {
        wavAlert.textContent = 'Danger';
        wavAlert.style.color = '#b00020';
    } else if (displayLevel === 'warning') {
        wavAlert.textContent = 'Warning';
        wavAlert.style.color = '#b26a00';
    } else {
        wavAlert.textContent = 'No alert';
        wavAlert.style.color = '#333';
    }

    return displayLevel;
}


// =========================
// Get Score
// =========================
export function computeLiveWavScore(feature) {
    if (!feature) return 0;

    const rmsMin = 0.000001;
    const rmsMax = 0.000013;

    const centroidMin = 100;
    const centroidMax = 1200;

    const zcrMin = 0.002;
    const zcrMax = 0.025;

    const clamp = (value, minValue, maxValue) =>
        Math.max(minValue, Math.min(value, maxValue));

    const normalize = (value, minValue, maxValue) => {
        if (maxValue <= minValue) return 0;
        return clamp((value - minValue) / (maxValue - minValue), 0, 1);
    };

    const rmsN = normalize(feature.rms, rmsMin, rmsMax);
    const centroidN = normalize(feature.centroid, centroidMin, centroidMax);
    const zcrN = normalize(feature.zcr, zcrMin, zcrMax);

    let highN = 0;
    if (feature.freq_H !== undefined) {
        highN = clamp(feature.freq_H, 0, 1);
    } else if (feature.band_high !== undefined) {
        highN = clamp(feature.band_high, 0, 1);
    }

    const score =
        0.35 * rmsN +
        0.20 * centroidN +
        0.25 * zcrN +
        0.20 * highN;

    return clamp(score, 0, 1);
}

function smoothScore(score) {
    smoothedScore = score * ALPHA + smoothedScore * (1 - ALPHA);
    return smoothedScore;
}

function startAlert(level, wavInfo, getWavInfo) {
    console.log('START ALERT: ', level, wavInfo.currentTime);
    
    const nowMs = performance.now();
    const startSec = Number(wavInfo.currentTime.toFixed(3));

    alertState.currentLevel = level;
    alertState.displayLevel = level;
    alertState.startTimeMs = nowMs;
    alertState.startWavSec = startSec;
    alertState.holdUntilMs = nowMs + ALERT_HOLD_MS;

    playHapticAlert(level);
    recordAlertEvent(level, getWavInfo);
}


const ENTER_WARNING = 0.58;
const EXIT_WARNING = 0.52;
const ENTER_DANGER = 0.68;
const EXIT_DANGER = 0.62;

export function getAlertLevelFromScore(score) {
    const s = smoothScore(score);
    const prev = alertState.currentLevel;

    if (prev === 'danger') {
        if (s >= EXIT_DANGER) return 'danger';
        if (s >= ENTER_WARNING) return 'warning';
        return 'none';
    }

    if (prev === 'warning') {
        if (s >= ENTER_DANGER) return 'danger';
        if (s >= EXIT_WARNING) return 'warning';
        return 'none';
    }

    if (s >= ENTER_DANGER) return 'danger';
    if (s >= ENTER_WARNING) return 'warning';
    return 'none';
}