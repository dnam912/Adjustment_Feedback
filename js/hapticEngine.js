let audioCtx = null;
let warningBuffer = null;
let dangerBuffer = null;
let currentSource = null;
let hapticTimer = null;

let hapticReadyPromise = null;
let hapticEnabled = false;


// =========================
// Init Haptic
// =========================
async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

export async function initHapticOutput() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(device => device.kind === 'audiooutput');

    /* AUDIO OUTPUTS - Media Device Info
        0: Speaker (Default)
        1: Woojer Strap Belt
    */
    const woojer = outputs.find(device =>
        device.deviceId !== 'default' &&
        device.label.includes('Woojer Strap Edge')
    );

    if (woojer && audioCtx.setSinkId) {
        await audioCtx.setSinkId(woojer.deviceId);
        hapticEnabled = true;
        console.log('Haptic output fixed to:', woojer.label);
    } else {
        hapticEnabled = false;
        console.warn('Woojer output not found.');
    }

    console.log('Loading haptic sounds...');
    warningBuffer = await loadSound('./sound/warning.mp3');
    console.log('Warning sound loaded');

    dangerBuffer = await loadSound('./sound/danger.wav');
    console.log('Danger sound loaded');
}

export function prepareHapticOutput() {
    if (!hapticReadyPromise) {
        hapticReadyPromise = initHapticOutput().catch(error => {
            hapticReadyPromise = null;
            console.warn('Haptic init failed:', error);
            throw error;
        });
    }

    return hapticReadyPromise;
}


// =========================
// Play warning / danger
// =========================
export function playHapticAlert(level) {
    if (!hapticEnabled) {
        return;
    }

    if (!audioCtx || !warningBuffer || !dangerBuffer) {
        console.warn('Haptic audio is not ready.');
        return;
    }

    if (hapticTimer) {
        clearTimeout(hapticTimer);
        hapticTimer = null;
    }

    if (currentSource) {
        try {
            currentSource.stop();
        } catch (error) {
            console.warn('Previous haptic source already stopped.');
        }

        currentSource = null;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = level === 'danger' ? dangerBuffer : warningBuffer;
    source.loop = true;
    source.connect(audioCtx.destination);

    source.start(0);
    currentSource = source;

    const duration = level === 'danger' ? 1000 : 1200;

    hapticTimer = setTimeout(() => {
        if (currentSource) {
            try {
                currentSource.stop();
            } catch (error) {
                console.warn('Haptic source already stopped.');
            }

            currentSource = null;
        }

        hapticTimer = null;
    }, duration);
}