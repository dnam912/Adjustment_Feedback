import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

import { init } from './init.js';
import { setupControls } from './control.js';
import { renderGraph } from './graph.js';
import { initMicrophone, stopMicrophone,
        ensureMicLine, updateAudioLine, hideMicLine,
        loadWavFile, playWavFile, stopWavFile, getWavInfo,
        getCurrentAudioFeature } from './audioEngine.js';

const { scene, renderer } = init();

let currentMode = 'audiogram';
let currentEar = 'both';
let micStarted = false;
let micEnabled = false;


function isAudioMode(mode) {
    return mode === 'realtime' || mode === 'wav';
}

function isWavMode(mode) {
    return mode === 'wav';
}

// =========================
// UI updates
// =========================
function updateLegend() {
    const audiogramLegend = document.getElementById('leg-audiogram');
    const realtimeLegend = document.getElementById('leg-realtime');

    if (!audiogramLegend || !realtimeLegend) {
        return;
    }

    const showAudiogram = currentMode === 'audiogram';
    const showRealtimeLegend = isAudioMode(currentMode);

    audiogramLegend.style.display = showAudiogram ? '' : 'none';
    realtimeLegend.style.display = showRealtimeLegend ? '' : 'none';
}

function updateAudioVisibility() {
    if (isAudioMode(currentMode)) {
        ensureMicLine(scene);
    } else {
        hideMicLine();
    }
}

function updateWavDisplay() {
    const wavFileName = document.getElementById('wavFileName');
    const wavTime = document.getElementById('wavTime');
    const wavInfo = getWavInfo();

    if (!wavFileName || !wavTime) {
        return;
    }

    wavFileName.textContent = wavInfo.fileName ? wavInfo.fileName : 'No file';
    wavTime.textContent =
        wavInfo.currentTime.toFixed(2) + ' / ' + wavInfo.duration.toFixed(2);
}

function refreshView() {
    renderGraph({
        scene: scene,
        renderer: renderer,
        mode: currentMode,
        ear: currentEar
    });

    updateAudioVisibility();
    updateLegend();
    updateWavDisplay();
}

// =========================
// Mode / Ear
// =========================
function renderMode(mode) {
    /*
        IMPLEMENTATION
    */

    currentMode = mode;
    refreshView();
}

function renderEar(ear) {
    currentEar = ear;
    refreshView();
}

// =========================
// Mic toggle
// =========================
async function handleMicToggle() {
    if (!micEnabled) {
        await initMicrophone();
        micStarted = true;
        micEnabled = true;
        return true;
    }

    stopMicrophone();
    micStarted = false;
    micEnabled = false;
    return false;
}

// =========================
// WAV
// =========================
async function handleWavLoad(event) {
    if (micEnabled) {
        alert('Turn off Mic first before loading a WAV file.');
        event.target.value = '';
        return;
    }

    const file = event.target.files[0];

    if (!file) {
        return;
    }

    await loadWavFile(file);

    updateWavAlert(null);
    currentMode = 'wav';
    refreshView();
}

async function handleWavPlay() {
    if (micEnabled) {
        alert('Turn off Mic first before playing a WAV file.');
        return false;
    }

    const started = await playWavFile();

    if (started) {
        currentMode = 'wav';
        refreshView();
        return true;
    }

    return false;
}

function handleWavStop() {
    stopWavFile();
    updateWavDisplay();
    updateWavAlert(null);
}

// =========================
// Init
// =========================
refreshView();

setupControls({
    initialMode: currentMode,
    initialEar: currentEar,
    initialMicEnabled: micEnabled,
    onModeChange: renderMode,
    onEarChange: renderEar,
    onMicToggle: handleMicToggle,
    onWavLoad: handleWavLoad,
    onWavPlay: handleWavPlay,
    onWavStop: handleWavStop
});

window.addEventListener('resize', () => {
    refreshView();
});


// =========================
// Woojer Belt
// =========================
let lastMatchTime = 0;
const MATCH_INTERVAL_MS = 100;

async function requestMatch(feature, fileName) {
    const res = await fetch("http://127.0.0.1:5050/match", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            feature: feature,
            file_name: fileName
        })
    });

    return await res.json();
}

function updateWavAlert(result) {
    const wavAlert = document.getElementById('wavAlert');

    if (!wavAlert) {
        return;
    }

    if (currentMode !== 'wav') {
        wavAlert.style.display = 'none';
        return;
    }

    wavAlert.style.display = '';

    if (!result || result.alert_level === 'none') {
        wavAlert.textContent = 'No alert';
        wavAlert.style.color = '#333';
        return;
    }

    if (result.alert_level === 'warning') {
        wavAlert.textContent = 'Warning';
        wavAlert.style.color = '#b26a00';
        return;
    }

    if (result.alert_level === 'danger') {
        wavAlert.textContent = 'Danger';
        wavAlert.style.color = '#b00020';
    }
}

function sendWoojerAlert(alertLevel, result) {
    if (alertLevel === 'none') {
        return;
    }

    console.log('alertLevel:', alertLevel, 'score:', result.danger_score);

    if (!window.woojerBridge) {
        console.log('woojerBridge missing');
        return;
    }

    console.log('sending to woojer');

    if (alertLevel === 'warning') {
        window.woojerBridge.send({
            pattern: 'warning',
            intensity: 0.55,
            durationMs: 250,
            score: result.danger_score
        });
        return;
    }

    if (alertLevel === 'danger') {
        window.woojerBridge.send({
            pattern: 'danger',
            intensity: 0.95,
            durationMs: 450,
            score: result.danger_score
        });
    }
}

async function processFeatureMatch(feature, fileName) {
    const result = await requestMatch(feature, fileName);

    if (!result) {
        updateWavAlert(null);
        return;
    }

    updateWavAlert(result);
    sendWoojerAlert(result.alert_level, result);
}


// =========================
// Animation
// =========================
function animateAudio() {
    requestAnimationFrame(animateAudio);

    if (isAudioMode(currentMode)) {
        updateAudioLine(scene, currentMode);
    }

    if (isWavMode(currentMode)) {
        updateWavDisplay();

        const now = performance.now();

        if (now - lastMatchTime >= MATCH_INTERVAL_MS) {
            lastMatchTime = now;

            const feature = getCurrentAudioFeature();
            const wavInfo = getWavInfo();

            if (feature && wavInfo.fileName && wavInfo.isPlaying) {
                processFeatureMatch(feature, wavInfo.fileName);
            }
        }
    } else {
        updateWavAlert(null);
    }
}

animateAudio();


/*
createGrid(scene, 0, 120, 10, mapHL)
updateAxisLabels(renderer, 'audiogram');

window.addEventListener('resize', () => {
    updateAxisLabels(renderer, 'audiogram');
});

// Test drawing a line
//const axes = new THREE.AxesHelper(50);
//scene.add(axes);
const material = new THREE.LineBasicMaterial({ color: 0x000000 });
const line = createLine([[-100,0], [100,0]], material);
scene.add(line);
console.log(scene.children);*/