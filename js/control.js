export function setupControls({
    initialMode = 'audiogram',
    initialEar = 'L',
    initialMicEnabled = false,
    onModeChange,
    onEarChange,
    onMicToggle,
    onWavLoad,
    onWavPlay,
    onWavStop
}) {
    const earControls = document.getElementById('ear-controls');
    const controls = document.getElementById('controls');
    const wavControls = document.getElementById('wav-controls');

    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnBoth = document.getElementById('btnBoth');
    const btnMic = document.getElementById('btnMic');

    const btnLoadWav = document.getElementById('btnLoadWav');
    const btnPlayWav = document.getElementById('btnPlayWav');
    const btnStopWav = document.getElementById('btnStopWav');
    const wavInput = document.getElementById('wavInput');
    const wavFileName = document.getElementById('wavFileName');
    const wavTime = document.getElementById('wavTime');

    const btnAudiogram = document.getElementById('btnAudiogram');
    const btnRealtime = document.getElementById('btnRealtime');
    const btnWav = document.getElementById('btnWav');
    const btnIntegration = document.getElementById('btnIntegration');

    const modeButtons = {
        audiogram: btnAudiogram,
        realtime: btnRealtime,
        wav: btnWav,
        integration: btnIntegration
    };

    const earButtons = {
        L: btnLeft,
        R: btnRight,
        both: btnBoth
    };

    let currentVisibleMode = initialMode;

    // =========================
    // Layout
    // =========================
    function placeControls() {
        const ticks = document.querySelectorAll('.x-tick');

        if (!ticks.length) {
            return;
        }

        let maxBottom = 0;

        ticks.forEach(tick => {
            const rect = tick.getBoundingClientRect();

            if (rect.bottom > maxBottom) {
                maxBottom = rect.bottom;
            }
        });

        const baseTop = window.scrollY + maxBottom + 16;
        const rowGap = 56;

        earControls.style.top = baseTop + 'px';
        //controls.style.top = (baseTop + rowGap) + 'px';
        //wavControls.style.top = (baseTop + rowGap * 2) + 'px';

        if (currentVisibleMode === 'wav') {
                wavControls.style.top = (baseTop + rowGap) + 'px';
                //controls.style.top = (baseTop + rowGap * 2) + 'px';
            } else {
                //controls.style.top = (baseTop + rowGap) + 'px';
                wavControls.style.top = (baseTop + rowGap * 2) + 'px';
            }
    }

    // =========================
    // Active states
    // =========================
    function setModeActive(mode) {
        for (const key in modeButtons) {
            modeButtons[key].classList.toggle('active', key === mode);
        }
    }

    function setEarActive(ear) {
        for (const key in earButtons) {
            earButtons[key].classList.toggle('active', key === ear);
        }
    }

    function setWavActive(state) {
        btnPlayWav.classList.toggle('active', state === 'play');
        btnStopWav.classList.toggle('active', state === 'stop');
    }

    function setMicActive(enabled) {
        btnMic.classList.toggle('active', enabled);
        btnMic.textContent = enabled ? 'Mic On' : 'Mic Off';
    }

    function setModeControlsVisible(mode) {
        const showMic = mode === 'realtime';
        const showWav = mode === 'wav';

        btnMic.style.display = showMic ? '' : 'none';

        btnLoadWav.style.display = showWav ? '' : 'none';
        btnPlayWav.style.display = showWav ? '' : 'none';
        btnStopWav.style.display = showWav ? '' : 'none';
        wavFileName.style.display = showWav ? '' : 'none';
        wavTime.style.display = showWav ? '' : 'none';

        earControls.style.display = mode === 'integration' ? 'none' : '';
        wavControls.style.display = mode === 'integration' ? 'none' : '';

        btnLeft.classList.toggle('locked', showWav);
        btnRight.classList.toggle('locked', showWav);
        btnBoth.classList.toggle('locked', showWav);
    }


    // =========================
    // Event helpers
    // =========================

    function handleModeClick(mode) {
        currentVisibleMode = mode;

        setModeActive(mode);
        setModeControlsVisible(mode);
        onModeChange(mode);

        if (mode !== 'integration') {
            requestAnimationFrame(placeControls);
        }
    }

    function handleEarClick(ear) {
        if (currentVisibleMode === 'wav' || currentVisibleMode === 'integration') {
            return;
        }
        
        setEarActive(ear);
        onEarChange(ear);

        requestAnimationFrame(placeControls);
    }

    // =========================
    // Bind mode / ear buttons
    // =========================

    for (const key in modeButtons) {
        modeButtons[key].addEventListener('click', () => {
            handleModeClick(key);
        });
    }

    for (const key in earButtons) {
        earButtons[key].addEventListener('click', () => {
            handleEarClick(key);
        });
    }


    // =========================
    // Mic button
    // =========================

    btnMic.addEventListener('click', async () => {
        const enabled = await onMicToggle();
        setMicActive(enabled);
    });


    // =========================
    // WAV buttons
    // =========================

    btnLoadWav.addEventListener('click', () => {
        wavInput.click();
    });

    wavInput.addEventListener('change', async (event) => {
        await onWavLoad(event);
        setWavActive('stop');
    });

    btnPlayWav.addEventListener('click', async () => {
        const started = await onWavPlay();

        if (started) {
            setWavActive('play');
        }
    });

    btnStopWav.addEventListener('click', async () => {
        await onWavStop();
        setWavActive('stop');
    });


    // =========================
    // Initial UI state
    // =========================

    setModeActive(initialMode);
    setEarActive(initialEar);
    setMicActive(initialMicEnabled);
    setModeControlsVisible(initialMode);
    setWavActive('stop');

    requestAnimationFrame(placeControls);

    window.addEventListener('resize', () => {
        if (currentVisibleMode !== 'integration') {
            requestAnimationFrame(placeControls);
        }
    });
}