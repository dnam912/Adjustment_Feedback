# audio_rules.py
def predict_events(features):
    rms = features["rms"]
    centroid = features["centroid"]
    zcr = features["zcr"]
    low = features["band_low"]
    mid = features["band_mid"]
    high = features["band_high"]

    pain = 0
    dull = 0
    volume = 0

    if rms > 0.02 and high > 0.45:
        pain = 2
    elif rms > 0.01 and high > 0.30:
        pain = 1

    if rms < 0.004 and centroid < 1200:
        dull = 2
    elif rms < 0.007 and centroid < 1800:
        dull = 1

    freq_l = to_band_level(low)
    freq_m = to_band_level(mid)
    freq_h = to_band_level(high)

    return {
        "pain": pain,
        "dull": dull,
        "volume": volume,
        "freq_l": freq_l,
        "freq_m": freq_m,
        "freq_h": freq_h
    }


def to_band_level(value):
    # 0.0 ~ 1.0
    scaled = round(value * 12 - 6)

    if scaled < -6:
        return -6
    if scaled > 6:
        return 6
    return scaled