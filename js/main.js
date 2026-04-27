import { init } from './init.js';
import { renderGraph } from './graph.js';
import { setupControls } from './control.js';
import { ensureMicLine, updateAudioLine, hideMicLine,
        getCurrentAudioFeature } from './audioEngine.js';
import { initMicrophone, stopMicrophone } from './micEngine.js';
import { loadWavFile, playWavFile, stopWavFile, getWavInfo } from './wavEngine.js';
import { computeLiveWavScore, updateWavAlert } from './wavAlert.js';
import { prepareHapticOutput } from './hapticEngine.js';
import { updateLegend, updateWavDisplay, updateFeaturePanel } from './interface.js';
import { recordTrialResponse, recordAlertEvent,
        startTrial, exportTrialCSV } from './experiment.js';


// =========================
// Variables
// =========================
let currentMode = 'audiogram';
let currentEar = 'both';
let micEnabled = false;

const graphPage = document.getElementById('graph-page');
const integrationPanel = document.getElementById('integration-panel');
const legend = document.getElementById('legend');
const featurePanel = document.getElementById('feature-panel');
const axisLabels = document.getElementById('axis-labels');

const { scene, renderer } = init();


function isAudioMode(mode) {
    return mode === 'realtime' || mode === 'wav';
}
function isWavMode(mode) { // Wav Player
    return mode === 'wav';
}


// =========================
// Update UI
// =========================
function updateAudioVisibility() {
    if (isAudioMode(currentMode)) {
        ensureMicLine(scene);
    } else {
        hideMicLine();
    }
}

function refreshView() {
    renderGraph({
        scene,
        renderer,
        mode: currentMode,
        ear: currentEar
    });

    updateAudioVisibility();
    updateLegend(currentMode, isAudioMode);
    updateWavDisplay(getWavInfo);
}


// =========================
// Mode / Ear
// =========================
function renderMode(mode) {
    currentMode = mode;

    if (mode !== 'realtime') {
        stopMicrophone();
        hideMicLine();
        micEnabled = false;
    }

    if (mode === 'integration') {
        graphPage.style.display = 'none';
        integrationPanel.style.display = 'block';
        legend.style.display = 'none';
        renderer.domElement.style.display = 'none';

        if (featurePanel) featurePanel.style.display = 'none';
        if (axisLabels) axisLabels.innerHTML = '';
        return;
    }

    integrationPanel.style.display = 'none';
    graphPage.style.display = '';
    legend.style.display = '';
    renderer.domElement.style.display = '';

    refreshView();
}

function renderEar(ear) {
    currentEar = ear;
    refreshView();
}


// =========================
// Mic
// =========================
async function handleMicToggle() {
    if (!micEnabled) {
        await initMicrophone();
        micEnabled = true;
        return true;
    }

    stopMicrophone();
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

    currentMode = 'wav';
    refreshView();
    updateWavAlert(currentMode, null);
}

async function handleWavPlay() {
    if (micEnabled) {
        alert('Turn off Mic first before playing a WAV file.');
        return false;
    }
    
    await prepareHapticOutput();
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

    currentMode = 'wav';

    updateWavDisplay(getWavInfo);
    refreshView();
    updateWavAlert(currentMode, null);
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
    onWavStop: handleWavStop,

    onStartTrial: async meta => {
        if (micEnabled) {
            alert('Turn off Mic first before starting trial.');
            return;
        }

        await prepareHapticOutput();
        const started = await startTrial({
            meta,
            playWavFile,
            stopWavFile,
            getWavInfo,
            refreshView,
            updateWavDisplay,
            updateWavAlert,
            currentMode
        });

        if (started) {
            currentMode = 'wav';
            return true;
        }
        return false;
    },

    onMarkWarning: meta => {
        recordTrialResponse('warning', meta, getWavInfo);
    },

    onMarkDanger: meta => {
        recordTrialResponse('danger', meta, getWavInfo);
    },

    onExportTrial: exportTrialCSV
});
window.addEventListener('resize', () => {
    refreshView();
});
//prepareHapticOutput();


// =========================
// Animation
// =========================
function animateAudio() {
    requestAnimationFrame(animateAudio);

    let feature = null;

    if (isAudioMode(currentMode)) {
        updateAudioLine(scene, currentMode);

        feature = getCurrentAudioFeature();
        updateFeaturePanel(currentMode, feature);
    } else {
        updateWavAlert(currentMode, null);
        updateFeaturePanel(currentMode, null);
    }

    if (isWavMode(currentMode)) {
        updateWavDisplay(getWavInfo);

        const wavInfo = getWavInfo();

        if (wavInfo.isPlaying) {
            const score = computeLiveWavScore(feature);

            console.log('feature:', feature);
            console.log('score:', score);

            updateWavAlert(currentMode, { score: score }, getWavInfo);
        } else {
            updateWavAlert(currentMode, null);
        }
    }
}
animateAudio();