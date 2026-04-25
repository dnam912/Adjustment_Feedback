const warningSound = new Audio('./sound/warning.mp3');
const dangerSound = new Audio('./sound/danger.mp3');


[warningSound, dangerSound].forEach(sound => {
    sound.preload = 'auto';
    sound.loop = true;
    sound.volume = 1.0;
});

let hapticTimer = null;
let currentSound = null;


// =========================
// Init device
// =========================
export async function initHapticOutput() {
    if (!warningSound.setSinkId || !dangerSound.setSinkId) {
        console.warn('setSinkId is not supported.');
        return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(device => device.kind === 'audiooutput');

    console.log('Audio outputs:', outputs);


    /* AUDIO OUTPUTS - Media Device Info
        0: Speaker (Default)
        1: Woojer Strap Belt
    */
    const woojer = outputs.find(device =>
        device.deviceId !== 'default' &&
        device.label.includes('Woojer Strap Edge')
    );

    if (!woojer) {
        console.warn('Woojer output not found.');
        return;
    }

    await warningSound.setSinkId(woojer.deviceId);
    await dangerSound.setSinkId(woojer.deviceId);

    console.log('Haptic output set to:', woojer.label);
}


// =========================
// Play warning / danger
// =========================
export function playHapticAlert(level) {
    if (hapticTimer) {
        clearTimeout(hapticTimer);
        hapticTimer = null;
    }

    if (currentSound) {
        currentSound.pause();
        currentSound.currentTime = 0;
    }

    currentSound =
        level === 'danger'
            ? dangerSound
            : warningSound;

    currentSound.play().catch(error => {
        console.warn('Haptic playback failed:', error);
    });

    const duration =
        level === 'danger' ? 1800 : 1200;

    hapticTimer = setTimeout(() => {
        currentSound.pause();
        currentSound.currentTime = 0;
        currentSound = null;
        hapticTimer = null;
    }, duration);
}
