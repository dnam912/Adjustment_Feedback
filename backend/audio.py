import librosa
import numpy as np
import soundfile as sf
from variables import *


def extract_features_from_chunk(y, sr):
    # RMS — average energy
    rms = librosa.feature.rms(y=y)[0].mean()

    # Spectral centroid — frequency weight
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0].mean()

    # Zero crossing rate — transient
    zcr = librosa.feature.zero_crossing_rate(y)[0].mean()

    # Spectral rolloff — frequency below 85% of energy
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0].mean()

    stft = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)

    low_mask = (freqs >= 125) & (freqs < 500)       # Low Freq
    mid_mask = (freqs >= 500) & (freqs < 3000)      # Mid Freq
    high_mask = (freqs >= 3000) & (freqs <= 6000)   # High Freq

    low_energy = stft[low_mask].mean() if np.any(low_mask) else 0.0
    mid_energy = stft[mid_mask].mean() if np.any(mid_mask) else 0.0
    high_energy = stft[high_mask].mean() if np.any(high_mask) else 0.0

    total = low_energy + mid_energy + high_energy + 1e-8

    return {
        RMS: float(rms),
        CENTROID: float(centroid),
        ZCR: float(zcr),
        ROLLOFF: float(rolloff),
        FREQ_L: float(low_energy / total),
        FREQ_M: float(mid_energy / total),
        FREQ_H: float(high_energy / total)
}


def extract_features_from_file(path, start_sec=0, duration_sec=1.0):
    y, sr = sf.read(path)

    if y.ndim == 2:
        y = np.mean(y, axis=1)

    y = y.astype(np.float64)

    start = int(start_sec * sr)
    end = int((start_sec + duration_sec) * sr)
    chunk = y[start:end]

    return extract_features_from_chunk(chunk, sr)