// Reference: 
// https://w3c.github.io/FileAPI/

function onFileLoad(event) {
    try {
        const patient = JSON.parse(event.target.result);

        if (patient.audiogram) { audiogramHL = patient.audiogram; }
        if (patient.moderateGain) { modGain = patient.moderateGain; }
        if (patient.mpo) { mpoData = patient.mpo; }
        // if (ucl) {}


        if (currentMod === 'audiogram') {
            createAudiogramView(currentEar);
        } else {
            createRealTimeView(currentEar);
        }

        UpdateAxisLabels();

    } catch (error) {
        alert('Invalid JSON file');
    }
}

function loadPatientData(event) {
    const reader = new FileReader();
    reader.onload = onFileLoad;
    reader.readAsText(event.target.file[0]);

}