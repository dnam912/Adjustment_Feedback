import { ensureAudioEngine, getAudioContext } from './audioEngine.js';


let wavBuffer = null;
let wavSource = null;
let wavFileName = '';
let wavStartTime = 0;
let wavOffset = 0;
let wavPlaying = false;
let wavDuration = 0;


// =========================
// WAV load / play
// =========================
export async function loadWavFile(file) {
    if (!file) {
        return;
    }

    const { audioCtx } = ensureAudioEngine();

    const arrayBuffer = await file.arrayBuffer();
    wavBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    wavFileName = file.name;
    wavDuration = wavBuffer.duration;
    wavOffset = 0;
    wavPlaying = false;

    if (wavSource) {
        wavSource.disconnect();
        wavSource = null;
    }
}

export async function setWavOutputDevice() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(device => device.kind === 'audiooutput');

    const target =
        outputs.find(d => d.label.includes('Bose')) ||
        outputs.find(d => d.label.includes('AirPods')) ||
        outputs.find(d =>
            d.deviceId !== 'default' &&
            !d.label.includes('Woojer') &&
            !d.label.includes('MacBook')
        ) ||
        outputs.find(d => d.label.includes('MacBook'));

    if (!target) {
        console.warn('No WAV output device found.');
        return;
    }

    const { audioCtx } = ensureAudioEngine();

    if (audioCtx.setSinkId) {
        await audioCtx.setSinkId(target.deviceId);
        console.log('WAV output set to:', target.label);
    }
}

export async function playWavFile() {
    const { audioCtx, analyser } = ensureAudioEngine();

    if (!audioCtx || !wavBuffer || !analyser) {
        return false;
    }

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    if (wavSource) {
        wavSource.disconnect();
        wavSource = null;
    }

    wavSource = audioCtx.createBufferSource();
    wavSource.buffer = wavBuffer;
    wavSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    wavStartTime = audioCtx.currentTime - wavOffset;
    wavPlaying = true;

    wavSource.onended = () => {
        if (wavPlaying) {
            wavPlaying = false;
            wavOffset = 0;
            wavSource = null;
        }
    };

    wavSource.start(0, wavOffset);

    return true;
}

export function stopWavFile() {
    const { audioCtx } = ensureAudioEngine();

    if (!audioCtx) {
        return;
    }

    if (wavPlaying) {
        wavOffset = audioCtx.currentTime - wavStartTime;
    }

    if (wavSource) {
        wavSource.onended = null;
        wavSource.stop();
        wavSource.disconnect();
        wavSource = null;
    }

    wavPlaying = false;
}

export function stopWavPlayback() {
    if (wavSource) {
        wavSource.stop();
        wavSource.disconnect();
        wavSource = null;
    }

    wavPlaying = false;
}

export function getWavInfo() {
    return {
        fileName: wavFileName,
        duration: wavDuration,
        currentTime: getCurrentPlaybackTime(),
        isPlaying: wavPlaying
    };
}


function getCurrentPlaybackTime() {
    const audioCtx = getAudioContext();

    if (!audioCtx || !wavPlaying) {
        return wavOffset;
    }

    const currentTime = audioCtx.currentTime - wavStartTime;
    return Math.min(currentTime, wavDuration);
}