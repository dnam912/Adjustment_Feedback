from variables import *

GAIN_RANGE = (-6, 6)


def clamp(value, low, high):
    return max(low, min(value, high))


def to_gain_level(value):
    low, high = GAIN_RANGE
    scaled = round(value * 12 - 6)
    return clamp(scaled, low, high)


def predict_audio_profile(features):
    return {
        FREQ_L: to_gain_level(features[FREQ_L]),
        FREQ_M: to_gain_level(features[FREQ_M]),
        FREQ_H: to_gain_level(features[FREQ_H])
    }