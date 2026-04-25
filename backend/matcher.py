import os
import pandas as pd
from variables import *
from backend.audio_rules import predict_audio_profile

BASE_DIR = os.path.dirname(__file__)

RMS_RANGE = (0.002, 0.025)
CENTROID_RANGE = (1200, 5000)
ZCR_RANGE = (0.01, 0.12)

ALERT_THRESHOLD = (0.45, 0.72)
GAIN_RANGE = (-6, 6)


def load_labels():
    path = os.path.join(BASE_DIR, "labels.csv")
    return pd.read_csv(path)


def clamp(value, low, high):
    return max(low, min(value, high))


def normalize(value, low, high):
    if high <= low:
        return 0.0
    return clamp((value - low) / (high - low), 0.0, 1.0)


def compute_raw_pain_score(feature):
    rms_n = normalize(feature[RMS], *RMS_RANGE)
    centroid_n = normalize(feature[CENTROID], *CENTROID_RANGE)
    zcr_n = normalize(feature[ZCR], *ZCR_RANGE)
    high_n = clamp(feature[FREQ_H], 0.0, 1.0)

    score = (
        0.30 * rms_n +
        0.25 * high_n +
        0.25 * centroid_n +
        0.20 * zcr_n
    )

    return clamp(score, 0.0, 1.0)


def match_event(feature, file_name, label):
    file_rows = label[label[FILE_NAME] == file_name]

    if len(file_rows) == 0:
        return None

    audio_profile = predict_audio_profile(feature)
    raw_pain_score = compute_raw_pain_score(feature)

    best_row = None
    best_dist = None

    for _, row in file_rows.iterrows():
        dist = 0.0

        dist += 1.5 * (audio_profile[FREQ_L] - row[GAIN_L]) ** 2
        dist += 2.0 * (audio_profile[FREQ_M] - row[GAIN_M]) ** 2
        dist += 3.0 * (audio_profile[FREQ_H] - row[GAIN_H]) ** 2

        if best_dist is None or dist < best_dist:
            best_dist = dist
            best_row = row

    match_confidence = 1.0 / (1.0 + best_dist)

    gain_min, gain_max = GAIN_RANGE
    gain_span = gain_max - gain_min

    event_weight = (
        0.15
        + 0.45 * (int(best_row[PAIN]) / 2.0)
        + 0.20 * (abs(int(best_row[GAIN_H])) / gain_span)
        + 0.10 * (abs(int(best_row[GAIN_M])) / gain_span)
        + 0.05 * (int(best_row[DULL]) / 2.0)
    )

    event_weight = clamp(event_weight, 0.0, 1.0)

    danger_score = (
        0.55 * raw_pain_score +
        0.25 * event_weight +
        0.20 * match_confidence
    )

    danger_score = clamp(danger_score, 0.0, 1.0)

    if danger_score >= ALERT_THRESHOLD[1]:
        alert_level = "danger"
    elif danger_score >= ALERT_THRESHOLD[0]:
        alert_level = "warning"
    else:
        alert_level = "none"

    return {
        FILE_NAME: best_row[FILE_NAME],
        EVENT_ORDER: int(best_row[EVENT_ORDER]),
        PAIN: int(best_row[PAIN]),
        DULL: int(best_row[DULL]),
        GAIN_L: int(best_row[GAIN_L]),
        GAIN_M: int(best_row[GAIN_M]),
        GAIN_H: int(best_row[GAIN_H]),
        ALERT_LEVEL: alert_level,
        DANGER_SCORE: round(danger_score, 4),
        RAW_PAIN_SCORE: round(raw_pain_score, 4),
        MATCH_CONFIDENCE: round(match_confidence, 4)
    }