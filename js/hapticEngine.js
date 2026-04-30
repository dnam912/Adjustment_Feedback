let audioCtx = null;
let warningBuffer = null;
let dangerBuffer = null;
let currentSource = null;
let hapticTimer = null;

let hapticReadyPromise = null;
let hapticEnabled = false;

let hapticGain = null;
let hapticFilter = null;


// =========================
// Init Haptic
// =========================
async function loadSound(url) {
    const response = await fetch(url);
     if (!response.ok) {
        throw new Error(`Failed to load sound: ${url}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

function findWoojerOutput(outputs) {
    return outputs.find(device =>
        device.deviceId !== 'default' &&
        device.label.includes('Woojer Strap Edge')
    );
}

export async function initHapticOutput() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        hapticGain = audioCtx.createGain();
        hapticGain.gain.value = 5.0;
        
        hapticFilter = audioCtx.createBiquadFilter();
        hapticFilter.type = 'lowpass';
        hapticFilter.frequency.value = 180;
        hapticFilter.Q.value = 0.8;

        hapticFilter.connect(hapticGain);
        hapticGain.connect(audioCtx.destination);
    }
    

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(device => device.kind === 'audiooutput');

    /* AUDIO OUTPUTS - Media Device Info
        0: Speaker (Default)
        1: Woojer Strap Belt
    */
    const woojer = findWoojerOutput(outputs);

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

    dangerBuffer = await loadSound('./sound/fronbondi.mp3');
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

function applyHapticSettings(level, source) {
    if (level === 'danger') {
        hapticGain.gain.value = 200.0; // Volume
        hapticFilter.frequency.value = 100; // frequency band
        hapticFilter.Q.value = 3.0; // sharpness
        source.playbackRate.value = 10.0; // playspeed

        return 2000; // duration
    }

    // 'Warning'
    hapticGain.gain.value = 3.0;
    hapticFilter.frequency.value = 500;
    //hapticFilter.Q.value = 0.5;
    source.playbackRate.value = 0.5;

    return 650; // duraation
}

// =========================
// Play warning / danger
// =========================
export function playHapticAlert(level) {
    console.log('PLAY HAPTIC CALLED:', level);

    if (!hapticEnabled) {
        console.warn('Haptic disabled');
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

    const duration = applyHapticSettings(level, source);

    //source.connect(audioCtx.destination);
    source.connect(hapticFilter);
    source.start(0);
    currentSource = source;

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