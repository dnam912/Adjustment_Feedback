# matcher.py
# labels.csv = candidate event table
# current audio feature -> choose nearest candidate row
# weighted toward painful segments for warning / danger output
import os
import pandas as pd

# For NODE in javascript
#const fs = require('fs');
#const path = require('path');

FEATURE_KEYS = [
    "rms",
    "centroid",
    "zcr",
    "rolloff",
    "band_low",
    "band_mid",
    "band_high"
]

BASE_DIR = os.path.dirname(__file__)
def load_labels():
    path = os.path.join(BASE_DIR, "labels.csv")
    return pd.read_csv(path)



def clamp(value, low, high):
    if value < low:
        return low
    if value > high:
        return high
    return value


def normalize(value, low, high):
    if high <= low:
        return 0.0
    return clamp((value - low) / (high - low), 0.0, 1.0)


# =========================
# current feature -> temporary rule profile
# =========================
def build_rule_profile(feature):
    rms = feature["rms"]
    centroid = feature["centroid"]
    high = feature["band_high"]
    mid = feature["band_mid"]
    low = feature["band_low"]

    pain = 0
    if rms > 0.015 and high > 0.35:
        pain = 2
    elif rms > 0.008 or high > 0.22:
        pain = 1

    dull = 0
    if centroid < 1200 and low > 0.45:
        dull = 2
    elif centroid < 1800:
        dull = 1

    gain_l = clamp(round(low * 6), 0, 6)
    gain_m = clamp(round(mid * 6), 0, 6)
    gain_h = clamp(round(high * 6), 0, 6)

    return {
        "pain": pain,
        "dull": dull,
        "gain_L": gain_l,
        "gain_M": gain_m,
        "gain_H": gain_h
    }


#=========================
# raw feature -> direct pain tendency
# do not compress too early
# =========================
def compute_raw_pain_score(feature):
    rms_n = normalize(feature["rms"], 0.002, 0.025)
    centroid_n = normalize(feature["centroid"], 1200, 5000)
    high_n = clamp(feature["band_high"], 0.0, 1.0)
    zcr_n = normalize(feature["zcr"], 0.01, 0.12)

    # weighted toward what is more likely to feel sharp / painful
    score = (
        0.40 * rms_n +
        0.30 * high_n +
        0.20 * centroid_n +
        0.10 * zcr_n
    )
    return clamp(score, 0.0, 1.0)


# =========================
# compare candidate rows
# pain is weighted highest
# =========================
def event_distance(rule_profile, row):
    total = 0.0

    total += 6.0 * (rule_profile["pain"] - row["pain"]) ** 2
    total += 1.5 * (rule_profile["dull"] - row["dull"]) ** 2

    total += 1.5 * (rule_profile["gain_L"] - row["gain_L"]) ** 2
    total += 2.0 * (rule_profile["gain_M"] - row["gain_M"]) ** 2
    total += 3.0 * (rule_profile["gain_H"] - row["gain_H"]) ** 2

    return total


def compute_event_weight(row):
    # accumulated labels should bias the matcher toward painful events
    pain_part = 0.55 * (int(row["pain"]) / 2.0)
    high_part = 0.25 * (int(row["gain_H"]) / 6.0)
    mid_part = 0.10 * (int(row["gain_M"]) / 6.0)
    dull_penalty = 0.10 * (int(row["dull"]) / 2.0)

    weight = 0.25 + pain_part + high_part + mid_part - dull_penalty
    return clamp(weight, 0.0, 1.0)


def classify_alert(raw_pain_score, event_weight, match_confidence):
    # raw audio feature stays alive here
    danger_score = (
        0.50 * raw_pain_score +
        0.30 * event_weight +
        0.20 * match_confidence
    )
    danger_score = clamp(danger_score, 0.0, 1.0)

    if danger_score >= 0.68:
        return "danger", danger_score

    if danger_score >= 0.35:
        return "warning", danger_score

    return "none", danger_score


# =========================
# choose best candidate for current file
# =========================
def match_event(feature, file_name, labels_df):
    file_rows = labels_df[labels_df["file_name"] == file_name]

    if len(file_rows) == 0:
        return None

    rule_profile = build_rule_profile(feature)
    raw_pain_score = compute_raw_pain_score(feature)

    best_idx = None
    best_dist = None

    for idx, row in file_rows.iterrows():
        dist = event_distance(rule_profile, row)

        if best_dist is None or dist < best_dist:
            best_dist = dist
            best_idx = idx

    matched = file_rows.loc[best_idx]

    match_confidence = 1.0 / (1.0 + best_dist)
    event_weight = compute_event_weight(matched)
    alert_level, danger_score = classify_alert(
        raw_pain_score,
        event_weight,
        match_confidence
    )

    return {
        "file_name": matched["file_name"],
        "event_order": int(matched["event_order"]),
        "pain": int(matched["pain"]),
        "dull": int(matched["dull"]),
        "gain_L": int(matched["gain_L"]),
        "gain_M": int(matched["gain_M"]),
        "gain_H": int(matched["gain_H"]),
        "alert_level": alert_level,
        "danger_score": round(danger_score, 4),
        "raw_pain_score": round(raw_pain_score, 4),
        "match_confidence": round(match_confidence, 4)
    }


# test
if __name__ == "__main__":
    labels = load_labels()

    current_feature = {
        "rms": 0.012,
        "centroid": 2100,
        "zcr": 0.03,
        "rolloff": 3200,
        "band_low": 0.22,
        "band_mid": 0.48,
        "band_high": 0.30
    }

    result = match_event(
        current_feature,
        "Lecture(Haptics)_2.wav",
        labels
    )

    print(result)