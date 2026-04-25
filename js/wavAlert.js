import { playHapticAlert } from './hapticEngine.js';

let scores = [];
let levels = [];
let previousAlertLevel = 'none';


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


export function updateWavAlert(currentMode, result) {
    const wavAlert = document.getElementById('wavAlert');

    if (!wavAlert) return;

    if (currentMode !== 'wav') {
        wavAlert.style.display = 'none';
        previousAlertLevel = 'none';
        return;
    }

    wavAlert.style.display = '';

    let score = 0;
    if (result && result.score != null) {
        score = result.score;
    }

    const alertLevel = getAlertLevelFromScore(score);

    if (alertLevel !== previousAlertLevel) {
        if (alertLevel === 'warning' || alertLevel === 'danger') {
            playHapticAlert();
        }

        previousAlertLevel = alertLevel;
    }

    if (alertLevel === 'none') {
        wavAlert.textContent = 'No alert';
        wavAlert.style.color = '#333';
        return;
    }

    if (alertLevel === 'warning') {
        wavAlert.textContent = 'Warning';
        wavAlert.style.color = '#b26a00';
        return;
    }

    if (alertLevel === 'danger') {
        wavAlert.textContent = 'Danger';
        wavAlert.style.color = '#b00020';
    }
}


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
    scores.push(score);

    if (scores.length > 45) {
        scores.shift();
    }

    let sum = 0;

    for (let i = 0; i < scores.length; i++) {
        sum += scores[i];
    }

    return sum / scores.length;
}

export function getAlertLevelFromScore(score) {

    score = smoothScore(score);

    let current = 'none';

    if (score >= 0.68) {
        current = 'danger';
    }
    else if (score >= 0.58) {
        current = 'warning';
    }

    levels.push(current);

    if (levels.length > 120) {
        levels.shift();
    }

    let warningCount = 0;
    let dangerCount = 0;

    for (let i = 0; i < levels.length; i++) {
        if (levels[i] === 'danger') {
            dangerCount++;
        }
        else if (levels[i] === 'warning') {
            warningCount++;
        }
    }

    if (dangerCount >= 25) {
        return 'danger';
    }

    if (warningCount >= 35) {
        return 'warning';
    }

    return 'none';
}