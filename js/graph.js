import patientData from '../data/hearingEval.json' with { type: 'json' };
import { createGrid, drawStaticLine,
    mapHL, mapSPL, mapWavLevel,
    updateAxisLabels, clearStatic } from './axis.js';


const audiogramDataHL = patientData.audiogramDataHL || {};
const modGainData = patientData.modGainData || {};
const mpoData = patientData.mpoData || {};

const MOD_INPUT_SPL = 65;

const RETSPL = {
    125: 45.0,
    250: 27.0,
    500: 13.5,
    1000: 7.0,
    2000: 9.0,
    4000: 9.0,
    8000: 13.0
};

function getEars(ear) {
    return ear === 'both' ? ['L', 'R'] : [ear];
}

function hlToSpl(freq, hl) {
    const nearest = Object.keys(RETSPL).reduce((a, b) =>
        Math.abs(b - freq) < Math.abs(a - freq) ? b : a
    );
    return hl + RETSPL[nearest];
}

function convertHLtoSPL(dataHL) {
    return dataHL.map(d => ({
        freq: d.freq,
        db: hlToSpl(d.freq, d.db)
    }));
}

function buildAudiogramView(scene, ear) {
    clearStatic(scene);
    createGrid(scene, 0, 120, 10, mapHL, 'audiogram');

    getEars(ear).forEach(e => {
        const color = e === 'L' ? 0x1a6ab0 : 0xaa2222;

        const data = (audiogramDataHL[e] || []).map(d => ({
            freq: d.freq,
            y: mapHL(d.db)
        }));

        drawStaticLine(scene, data, color, false, 'audiogram');
    });
}

function buildRealtimeView(scene, ear) {
    clearStatic(scene);
    createGrid(scene, 50, 135, 10, mapSPL, 'realtime');

    getEars(ear).forEach(e => {
        const gainColor = e === 'L' ? 0x1a6ab0 : 0xaa2222;
        const mpoColor = e === 'L' ? 0x0a2a4a : 0x440a0a;
        const thresholdColor = e === 'L' ? 0x2277bb : 0xbb3333;

        const modOutputSPL = (modGainData[e] || []).map(d => ({
            freq: d.freq,
            y: mapSPL(MOD_INPUT_SPL + d.db)
        }));

        const mpo = (mpoData[e] || []).map(d => ({
            freq: d.freq,
            y: mapSPL(d.db)
        }));

        const thresholdSPL = convertHLtoSPL(audiogramDataHL[e] || []).map(d => ({
            freq: d.freq,
            y: mapSPL(d.db)
        }));

        drawStaticLine(scene, modOutputSPL, gainColor, false, 'realtime');
        drawStaticLine(scene, mpo, mpoColor, true, 'realtime');
        drawStaticLine(scene, thresholdSPL, thresholdColor, true, 'realtime');
    });
}

function buildWavView(scene) {
    clearStatic(scene);
    createGrid(scene, -100, 0, 10, mapWavLevel, 'realtime');
}

function buildIntegrationView(scene) {
    clearStatic(scene);

    /* 
        IMPLEMENTATION
    */
}

export function renderGraph({ scene, renderer, mode, ear = 'L' }) {
    if (mode === 'audiogram') {
        buildAudiogramView(scene, ear);
        updateAxisLabels(renderer, 'audiogram');
        return;
    }

    if (mode === 'realtime') {
        buildRealtimeView(scene, ear);
        updateAxisLabels(renderer, 'realtime');
        return;
    }

    if (mode === 'wav') {
        buildWavView(scene);
        updateAxisLabels(renderer, 'realtime');
        return;
    }

    if (mode === 'integration') {
        buildIntegrationView(scene);
        return;
    }
}