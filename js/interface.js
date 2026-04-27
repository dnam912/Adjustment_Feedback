function formatTime(seconds) {
    const total = Math.floor(seconds);
    const min = Math.floor(total / 60);
    const sec = total % 60;

    return min + ':' + String(sec).padStart(2, '0');
}

export function updateLegend(currentMode, isAudioMode) {
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

export function updateWavDisplay(getWavInfo) {
    const wavFileName = document.getElementById('wavFileName');
    const wavTime = document.getElementById('wavTime');
    const wavInfo = getWavInfo();

    if (!wavFileName || !wavTime) {
        return;
    }

    wavFileName.textContent = wavInfo.fileName ? wavInfo.fileName : 'No file';
    wavTime.textContent =
        formatTime(wavInfo.currentTime) + ' / ' + formatTime(wavInfo.duration);
}

export function updateFeaturePanel(currentMode, feature) {
    const panel = document.getElementById('feature-panel');
    if (!panel) return;

    if (!feature || currentMode === 'integration') {
        panel.style.display = 'none';
        return;
    }

    const show = currentMode === 'realtime' || currentMode === 'wav';
    panel.style.display = show ? 'block' : 'none';

    if (!show) return;

    document.getElementById('feat-rms').textContent = feature.rms.toFixed(6);
    document.getElementById('feat-centroid').textContent = feature.centroid.toFixed(2);
    document.getElementById('feat-zcr').textContent = feature.zcr.toFixed(6);
    document.getElementById('feat-rolloff').textContent = feature.rolloff.toFixed(2);
    document.getElementById('feat-low').textContent = feature.band_low.toFixed(6);
    document.getElementById('feat-mid').textContent = feature.band_mid.toFixed(6);
    document.getElementById('feat-high').textContent = feature.band_high.toFixed(6);
}