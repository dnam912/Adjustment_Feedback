import { ensureAudioEngine } from './audioEngine.js';

let micSource = null;
let streamRef = null;


// =========================
// Init Microphone
// =========================
export async function initMicrophone() {
    if (micSource) {
        return;
    }

    const { audioCtx, analyser } = ensureAudioEngine();

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    });

    streamRef = stream;
    micSource = audioCtx.createMediaStreamSource(stream);
    micSource.connect(analyser);
    console.log('Mic connected to analyser');
}


// =========================
// Stop microphone
// =========================
export function stopMicrophone() {
    if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
        streamRef = null;
    }

    if (micSource) {
        micSource.disconnect();
        micSource = null;
    }
}