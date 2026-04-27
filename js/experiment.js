export const experimentState = {
    logs: [],
    active: false,
    timer: null,
    meta: null,
    lastAlert: null
};

const TRIAL_DURATION = 60000;

export async function startTrial({
    meta,
    playWavFile,
    stopWavFile,
    getWavInfo,
    refreshView,
    updateWavDisplay,
    updateWavAlert,
    currentMode
}) {
    const started = await playWavFile();

    if (!started) {
        alert('Load a WAV file first.');
        return false;
    }

    experimentState.active = true;
    experimentState.meta = meta;

    if (experimentState.timer) {
        clearTimeout(experimentState.timer);
    }

    refreshView();

    experimentState.timer = setTimeout(() => {
        stopWavFile();

        experimentState.active = false;
        experimentState.timer = null;

        updateWavDisplay(getWavInfo);
        refreshView();
        updateWavAlert(currentMode, null);
    }, TRIAL_DURATION);

    return true;
}

export function recordAlertEvent(alertLevel, getWavInfo) {
    if (!experimentState.active) {
        return;
    }

    if (alertLevel !== 'warning' && alertLevel !== 'danger') {
        return;
    }

    const wavInfo = getWavInfo();
    const startSec = Number(wavInfo.currentTime.toFixed(3));
    const endSec = Number((startSec + 2.0).toFixed(3));

    experimentState.lastAlert = {
        level: alertLevel,
        start_sec: startSec,
        end_sec: endSec,
        system_start_ms: performance.now()
    };
}

export function recordTrialResponse(buttonLevel, meta, getWavInfo) {
    if (!experimentState.active) {
        return;
    }

    const wavInfo = getWavInfo();
    const buttonHitSec = Number(wavInfo.currentTime.toFixed(3));
    const systemHitMs = performance.now();
    const alert = experimentState.lastAlert;

    let delaySec = '';
    let overtimeSec = '';
    let status = 'no_alert';

    if (alert) {
        // ms -> s
        delaySec = Number(((systemHitMs - alert.system_start_ms) / 1000).toFixed(3));
        
        // Check if buttonLevel and alertLevel is the same
        if (buttonLevel === alert.level) {
            if (buttonHitSec <= alert.end_sec) {
                status = 'hit';
            } else {
                status = 'late';
                // Compute delayed time if a user hit the button after the alert
                overtimeSec = Number((buttonHitSec - alert.end_sec).toFixed(3));
            }
        } else {
            status = 'wrong';
        }
    }

    experimentState.logs.push({
        participant_name: meta.name,
        participant_id: meta.id,
        trial_number: meta.trial,

        test_mode: meta.condition,
        file_name: wavInfo.fileName,

        alert_level: alert ? alert.level : '',
        alert_start_sec: alert ? alert.start_sec : '',
        alert_end_sec: alert ? alert.end_sec : '',

        button_level: buttonLevel,
        button_hit_sec: buttonHitSec,
        delay_sec: delaySec,
        overtime_sec: overtimeSec,
        response_status: status
    });

    console.log('trialLogs:', experimentState.logs);
}

export function exportTrialCSV() {
    console.log('exportTrialCSV called');
    console.log('logs:', experimentState.logs);

    if (!experimentState.logs.length) {
        alert('No trial data to export.');
        return;
    }

    const headers = [
        'participant_name',
        'participant_id',
        'trial_number',
        'test_mode',
        'file_name',
        'alert_level',
        'alert_start_sec',
        'alert_end_sec',
        'button_level', 
        'button_hit_sec',
        'delay_sec',
        'overtime_sec',
        'response_status'
    ];

    const rows = experimentState.logs.map(log =>
        headers.map(key => JSON.stringify(log[key] ?? '')).join(',')
    );

    const csv = [
        headers.join(','),
        ...rows
    ].join('\n');

    const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'trial_results.csv';
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

export function resetTrial() {
    experimentState.active = false;
    experimentState.meta = null;

    if (experimentState.timer) {
        clearTimeout(experimentState.timer);
        experimentState.timer = null;
    }
}