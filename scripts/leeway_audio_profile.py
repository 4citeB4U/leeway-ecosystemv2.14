#!/usr/bin/env python
"""
Profile a WAV/PCM audio artifact for LeeWay hearing calibration and input-purity work.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf


def to_dbfs(value: float) -> float:
    return 20.0 * np.log10(max(float(value), 1e-12))


def band_ratio(power: np.ndarray, freqs: np.ndarray, lo: float, hi: float | None) -> float:
    if hi is None:
        mask = freqs >= lo
    else:
        mask = (freqs >= lo) & (freqs < hi)
    total = float(np.sum(power)) + 1e-12
    return float(np.sum(power[mask]) / total)


def percentile_map(values: np.ndarray) -> dict:
    return {
        "min": round(float(np.min(values)), 4),
        "p10": round(float(np.percentile(values, 10)), 4),
        "p50": round(float(np.percentile(values, 50)), 4),
        "p90": round(float(np.percentile(values, 90)), 4),
        "max": round(float(np.max(values)), 4),
        "mean": round(float(np.mean(values)), 4),
    }


def profile_audio(audio_path: Path) -> dict:
    audio, sample_rate = sf.read(str(audio_path), always_2d=True)
    channels = int(audio.shape[1])
    mono = np.mean(audio, axis=1).astype(np.float32)
    duration_seconds = float(len(mono) / sample_rate) if sample_rate else 0.0

    rms = float(np.sqrt(np.mean(np.square(mono)) + 1e-12))
    peak = float(np.max(np.abs(mono)) + 1e-12)
    clip_ratio = float(np.mean(np.abs(mono) >= 0.995))

    frame_length = max(int(sample_rate * 0.02), 1)
    hop_length = max(int(sample_rate * 0.01), 1)
    framed = librosa.util.frame(mono, frame_length=frame_length, hop_length=hop_length).T
    frame_rms = np.sqrt(np.mean(np.square(framed), axis=1) + 1e-12)
    frame_dbfs = 20.0 * np.log10(frame_rms + 1e-12)

    noise_floor_dbfs = float(np.percentile(frame_dbfs, 15))
    speech_gate_dbfs = max(noise_floor_dbfs + 10.0, -52.0)
    silence_gate_dbfs = max(noise_floor_dbfs + 3.0, -60.0)
    speech_activity_ratio = float(np.mean(frame_dbfs >= speech_gate_dbfs))
    silence_ratio = float(np.mean(frame_dbfs <= silence_gate_dbfs))

    stft = np.abs(librosa.stft(mono, n_fft=1024, hop_length=256)) ** 2
    freqs = librosa.fft_frequencies(sr=sample_rate, n_fft=1024)
    low_ratio = band_ratio(stft, freqs, 0.0, 120.0)
    speech_ratio = band_ratio(stft, freqs, 300.0, 3400.0)
    high_ratio = band_ratio(stft, freqs, 4000.0, None)

    spectral_centroid = librosa.feature.spectral_centroid(S=np.sqrt(stft), sr=sample_rate)[0]
    spectral_flatness = librosa.feature.spectral_flatness(S=stft + 1e-12)[0]
    zero_crossing_rate = librosa.feature.zero_crossing_rate(
        mono, frame_length=frame_length, hop_length=hop_length
    )[0]

    if speech_activity_ratio < 0.12 and speech_ratio < 0.30:
        dominant_profile = "AMBIENT_OR_BACKGROUND_HEAVY"
    elif speech_activity_ratio > 0.60 and silence_ratio < 0.12:
        dominant_profile = "CONTINUOUS_SOURCE_OR_NEARFIELD_SPEECH"
    else:
        dominant_profile = "MIXED_SPEECH_AND_BACKGROUND"

    contamination_risks = []
    if low_ratio > 0.18:
        contamination_risks.append("LOW_FREQUENCY_RUMBLE_RISK")
    if high_ratio > 0.20:
        contamination_risks.append("HIGH_FREQUENCY_HISS_RISK")
    if speech_activity_ratio > 0.70 and silence_ratio < 0.08:
        contamination_risks.append("CONTINUOUS_PROGRAM_AUDIO_RISK")
    if clip_ratio > 0.001:
        contamination_risks.append("CLIPPING_RISK")

    return {
        "path": str(audio_path),
        "channels": channels,
        "sampleRate": int(sample_rate),
        "durationSeconds": round(duration_seconds, 4),
        "sampleCount": int(len(mono)),
        "rmsDbfs": round(to_dbfs(rms), 4),
        "peakDbfs": round(to_dbfs(peak), 4),
        "dynamicRangeDb": round(to_dbfs(peak) - to_dbfs(rms), 4),
        "clipRatio": round(clip_ratio, 6),
        "noiseFloorDbfsEstimate": round(noise_floor_dbfs, 4),
        "speechGateDbfs": round(speech_gate_dbfs, 4),
        "silenceGateDbfs": round(silence_gate_dbfs, 4),
        "speechActivityRatio": round(speech_activity_ratio, 4),
        "silenceRatio": round(silence_ratio, 4),
        "bandEnergyRatios": {
            "lowFrequencyBelow120Hz": round(low_ratio, 4),
            "speechBand300To3400Hz": round(speech_ratio, 4),
            "highFrequencyAbove4000Hz": round(high_ratio, 4),
        },
        "spectralCentroidHz": percentile_map(spectral_centroid),
        "spectralFlatness": percentile_map(spectral_flatness),
        "zeroCrossingRate": percentile_map(zero_crossing_rate),
        "frameDbfs": percentile_map(frame_dbfs),
        "dominantProfile": dominant_profile,
        "contaminationRisks": contamination_risks,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-path", required=True)
    parser.add_argument("--output-json", default="")
    args = parser.parse_args()

    audio_path = Path(args.audio_path).resolve()
    profile = profile_audio(audio_path)
    body = json.dumps(profile, indent=2) + "\n"
    if args.output_json:
        Path(args.output_json).resolve().write_text(body, encoding="utf-8")
    print(body, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
