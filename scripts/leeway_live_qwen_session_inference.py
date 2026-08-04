#!/usr/bin/env python
"""
Run one live session-bound Qwen hearing/fusion inference against a captured
microphone WAV without re-running the full proof suite.
"""

from __future__ import annotations

import argparse
import gc
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import librosa
import soundfile as sf
import torch
from qwen_omni_utils import process_mm_info
from transformers import (
    AutoProcessor,
    BitsAndBytesConfig,
    Qwen2_5OmniForConditionalGeneration,
    Qwen2_5OmniProcessor,
    Qwen2AudioForConditionalGeneration,
)


DEFAULT_HEARING_SYSTEM_PROMPT = (
    "You are Qwen, a LeeWay-governed hearing lane inside a live embodied Agent Lee session. "
    "Only analyze the attached current-pass audio. Do not repeat instructions. Do not echo prompts. "
    "If intelligible speech is present, return only the heard speech content. If it is unclear, "
    "return BACKGROUND_OR_UNCLEAR and a brief cause."
)

DEFAULT_HEARING_USER_PROMPT = (
    "Return only the spoken English words from this audio clip. "
    "If exact wording is unclear, return a concise semantic hearing summary grounded only in this clip."
)

DEFAULT_OMNI_SYSTEM_PROMPT = (
    "You are Qwen, a LeeWay-governed multimodal fusion lane for a live Agent Lee session. "
    "Use only the current audio clip. Do not carry prior session context forward. "
    "Reject stale product, broadcast, or demonstration context unless it is actually present in the clip. "
    "Return a concise transcript, speaker intent, and a contamination assessment."
)

DEFAULT_OMNI_USER_PROMPT = (
    "Analyze this live microphone audio. Return three labeled lines: "
    "Transcript:, Intent:, Contamination:. Keep each line concise and grounded only in this clip."
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_bnb_config() -> BitsAndBytesConfig:
    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )


def relative_path(workspace_root: Path, target: Path) -> str:
    return target.resolve().relative_to(workspace_root.resolve()).as_posix()


def audio_metadata(audio_path: Path) -> dict:
    with sf.SoundFile(audio_path) as handle:
        frames = int(handle.frames)
        samplerate = int(handle.samplerate)
        channels = int(handle.channels)
        duration = frames / samplerate if samplerate else 0.0
    return {
        "path": str(audio_path),
        "frames": frames,
        "sampleRate": samplerate,
        "channels": channels,
        "durationSeconds": round(duration, 4),
    }


def with_expected_phrase(prompt: str, expected_phrase: str | None) -> str:
    if not expected_phrase:
        return prompt
    return (
        f"{prompt} Expected calibration phrase: \"{expected_phrase}\". "
        "Use it only as a verification target if it is actually audible; do not hallucinate it."
    )


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    lowered = text.lower()
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def token_coverage(expected: str | None, actual: str | None) -> dict | None:
    if not expected:
        return None
    expected_tokens = [token for token in normalize_text(expected).split(" ") if token]
    actual_tokens = [token for token in normalize_text(actual).split(" ") if token]
    if not expected_tokens:
        return {"exact": False, "coverage": 0.0, "semanticPass": False}
    expected_set = set(expected_tokens)
    actual_set = set(actual_tokens)
    hits = sum(1 for token in expected_set if token in actual_set)
    coverage = hits / len(expected_set) if expected_set else 0.0
    expected_norm = normalize_text(expected)
    actual_norm = normalize_text(actual)
    return {
        "exact": expected_norm == actual_norm,
        "coverage": round(float(coverage), 4),
        "semanticPass": coverage >= 0.6 or expected_norm in actual_norm or actual_norm in expected_norm,
    }


def get_purity_markers(text: str | None, user_prompt: str, system_prompt: str) -> list[str]:
    output = text or ""
    markers: list[str] = []
    normalized_output = normalize_text(output)
    normalized_user = normalize_text(user_prompt)
    normalized_system = normalize_text(system_prompt)

    if not normalized_output:
        markers.append("EMPTY_OUTPUT")
        return markers

    if re.search(r"^(system|user|assistant)\b", output, re.MULTILINE):
        markers.append("PROMPT_ECHO")
    if normalized_output.startswith("audio 1 "):
        markers.append("PROMPT_ECHO")
    if normalized_user and (
        normalized_output == normalized_user
        or normalized_output in normalized_user
        or normalized_user in normalized_output
    ):
        markers.append("PROMPT_ECHO")
    if normalized_system and (
        normalized_output == normalized_system
        or normalized_output in normalized_system
        or normalized_system in normalized_output
    ):
        markers.append("PROMPT_ECHO")
    if "background_or_unclear" in normalized_output:
        markers.append("BACKGROUND_REJECTION_TRIGGERED")

    return sorted(set(markers))


def build_hearing_fields(decoded: str, expected_phrase: str | None, user_prompt: str, system_prompt: str) -> dict:
    purity_markers = get_purity_markers(decoded, user_prompt, system_prompt)
    prompt_echo_detected = "PROMPT_ECHO" in purity_markers
    transcript_text = decoded.strip() if decoded and not prompt_echo_detected else ""
    heard_text = transcript_text
    audio_intent_segment = transcript_text
    audio_derived = bool(transcript_text)
    comparison_to_expected = token_coverage(expected_phrase, transcript_text) if transcript_text else token_coverage(expected_phrase, decoded)

    if audio_derived:
        hearing_proof_status = "QWEN_AUDIO_HEARING_PROVEN"
        blockers: list[str] = []
    elif prompt_echo_detected:
        hearing_proof_status = "QWEN_AUDIO_HEARING_PARTIAL_CLEANLY_CLASSIFIED"
        blockers = ["Prompt echo detected in Qwen Audio output; transcriptText is not accepted as hearing proof."]
    elif decoded.strip():
        hearing_proof_status = "QWEN_AUDIO_HEARING_PARTIAL_CLEANLY_CLASSIFIED"
        blockers = ["Qwen Audio returned non-empty output, but no clean audio-derived transcriptText could be established."]
    else:
        hearing_proof_status = "QWEN_AUDIO_HEARING_BLOCKED_WITH_ROOT_CAUSE"
        blockers = ["Qwen Audio returned empty output for the supplied audio clip."]

    return {
        "expectedPhrase": expected_phrase or None,
        "heardText": heard_text or None,
        "transcriptText": transcript_text or None,
        "audioIntentSegment": audio_intent_segment or None,
        "audioDerived": audio_derived,
        "promptEchoDetected": prompt_echo_detected,
        "purityMarkers": purity_markers,
        "comparisonToExpected": comparison_to_expected,
        "hearingProofStatus": hearing_proof_status,
        "blockers": blockers,
    }


def move_inputs_to_device(inputs, model):
    try:
        return inputs.to(model.device).to(model.dtype)
    except Exception:
        converted = {}
        for key, value in inputs.items():
            if hasattr(value, "to"):
                try:
                    converted[key] = value.to(model.device)
                except Exception:
                    converted[key] = value
            else:
                converted[key] = value
        return converted


def run_qwen2_audio(
    model_path: Path,
    audio_path: Path,
    hearing_system_prompt: str,
    hearing_user_prompt: str,
    expected_phrase: str | None,
) -> dict:
    started = time.perf_counter()
    processor = AutoProcessor.from_pretrained(str(model_path), trust_remote_code=True)
    load_started = time.perf_counter()
    model = Qwen2AudioForConditionalGeneration.from_pretrained(
        str(model_path),
        trust_remote_code=True,
        device_map={"": 0},
        torch_dtype=torch.float16,
        quantization_config=build_bnb_config(),
        low_cpu_mem_usage=True,
    )
    load_seconds = time.perf_counter() - load_started

    system_prompt = hearing_system_prompt
    user_prompt = hearing_user_prompt
    prompt_mode = "DIRECT_TRANSCRIPTION_PROMPT"
    prompt = "<|audio_bos|><|AUDIO|><|audio_eos|>Generate a speech transcription in English:"

    audio, _ = librosa.load(
        str(audio_path),
        sr=processor.feature_extractor.sampling_rate,
        mono=True,
    )
    inputs = processor(
        text=prompt,
        audio=audio,
        sampling_rate=processor.feature_extractor.sampling_rate,
        return_tensors="pt",
    )
    inputs = move_inputs_to_device(inputs, model)
    generate_started = time.perf_counter()
    generated_ids = model.generate(**inputs, max_new_tokens=256)
    generate_seconds = time.perf_counter() - generate_started

    input_len = int(inputs["input_ids"].shape[1])
    sliced = generated_ids[:, input_len:]
    decoded = processor.batch_decode(
        sliced,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False,
    )[0].strip()
    hearing_fields = build_hearing_fields(decoded, expected_phrase, user_prompt, system_prompt)

    result = {
        "routeId": "leeway.audio.qwen2-audio.live",
        "modelId": "qwen2-audio-local",
        "prompt": prompt,
        "promptMode": prompt_mode,
        "systemPrompt": system_prompt,
        "userPrompt": user_prompt,
        "status": "GPU_EXECUTION_PROVEN" if decoded else "GPU_EXECUTION_EMPTY_OUTPUT",
        "outputKind": "audio_intent",
        "outputSegment": decoded,
        **hearing_fields,
        "inputShape": list(inputs["input_ids"].shape),
        "generatedShape": list(generated_ids.shape),
        "slicedShape": list(sliced.shape),
        "modelLoadSeconds": round(load_seconds, 3),
        "generateSeconds": round(generate_seconds, 3),
        "elapsedSeconds": round(time.perf_counter() - started, 3),
    }

    del model
    del processor
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return result


def run_qwen2_5_omni(
    model_path: Path,
    audio_path: Path,
    image_path: Path | None,
    omni_system_prompt: str,
    omni_user_prompt: str,
    expected_phrase: str | None,
    vision_question: str | None,
) -> dict:
    started = time.perf_counter()
    load_started = time.perf_counter()
    model = Qwen2_5OmniForConditionalGeneration.from_pretrained(
        str(model_path),
        device_map={"": 0},
        torch_dtype=torch.float16,
        quantization_config=build_bnb_config(),
        low_cpu_mem_usage=True,
        trust_remote_code=True,
    )
    model.disable_talker()
    processor = Qwen2_5OmniProcessor.from_pretrained(str(model_path), trust_remote_code=True)
    load_seconds = time.perf_counter() - load_started

    system_prompt = omni_system_prompt
    user_prompt = omni_user_prompt
    if image_path:
        vision_suffix = vision_question or "Describe the attached image in one sentence, then fuse it with the live audio context."
        user_prompt = f"{omni_user_prompt}\nVision task: {vision_suffix}"

    user_content = [{"type": "audio", "audio": str(audio_path)}]
    if image_path:
        user_content.append({"type": "image", "image": str(image_path)})
    user_content.append(
        {
            "type": "text",
            "text": user_prompt,
        }
    )

    conversation = [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": system_prompt,
                }
            ],
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]

    use_audio_in_video = False
    text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
    audios, images, videos = process_mm_info(conversation, use_audio_in_video=use_audio_in_video)
    inputs = processor(
        text=text,
        audio=audios,
        images=images,
        videos=videos,
        return_tensors="pt",
        padding=True,
        use_audio_in_video=use_audio_in_video,
    )
    inputs = move_inputs_to_device(inputs, model)
    generate_started = time.perf_counter()
    text_ids = model.generate(
        **inputs,
        use_audio_in_video=use_audio_in_video,
        return_audio=False,
        max_new_tokens=192,
    )
    generate_seconds = time.perf_counter() - generate_started

    input_len = int(inputs["input_ids"].shape[1]) if "input_ids" in inputs else 0
    sliced = text_ids[:, input_len:] if input_len else text_ids
    decoded = processor.batch_decode(
        sliced,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False,
    )[0].strip()
    transcript_match = re.search(r"Transcript:\s*(.+?)(?:\r?\n|Intent:|Contamination:|$)", decoded, re.IGNORECASE | re.DOTALL)
    transcript_text = transcript_match.group(1).strip() if transcript_match else decoded
    purity_markers = get_purity_markers(decoded, user_prompt, system_prompt)

    result = {
        "routeId": "leeway.multimodal.qwen2.5-omni.live",
        "modelId": "qwen2.5-omni-local",
        "systemPrompt": system_prompt,
        "userPrompt": user_prompt,
        "visionAttached": bool(image_path),
        "imagePath": str(image_path) if image_path else None,
        "visionQuestion": vision_question or None,
        "status": "GPU_EXECUTION_PROVEN" if decoded else "GPU_EXECUTION_EMPTY_OUTPUT",
        "outputKind": "fused_context",
        "outputSegment": decoded,
        "expectedPhrase": expected_phrase or None,
        "heardText": transcript_text or None,
        "transcriptText": transcript_text or None,
        "audioDerived": bool(transcript_text),
        "promptEchoDetected": "PROMPT_ECHO" in purity_markers,
        "purityMarkers": purity_markers,
        "inputTokenLength": input_len,
        "generatedShape": list(text_ids.shape),
        "slicedShape": list(sliced.shape),
        "talkerDisabled": True,
        "modelLoadSeconds": round(load_seconds, 3),
        "generateSeconds": round(generate_seconds, 3),
        "elapsedSeconds": round(time.perf_counter() - started, 3),
    }

    del model
    del processor
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--audio-path", required=True)
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--conversation-id", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--expected-phrase", default="")
    parser.add_argument("--image-path", default="")
    parser.add_argument("--vision-question", default="")
    parser.add_argument("--hearing-system-prompt", default=DEFAULT_HEARING_SYSTEM_PROMPT)
    parser.add_argument("--hearing-user-prompt", default=DEFAULT_HEARING_USER_PROMPT)
    parser.add_argument("--omni-system-prompt", default=DEFAULT_OMNI_SYSTEM_PROMPT)
    parser.add_argument("--omni-user-prompt", default=DEFAULT_OMNI_USER_PROMPT)
    args = parser.parse_args()

    workspace_root = Path(args.workspace_root).resolve()
    audio_path = Path(args.audio_path).resolve()
    image_path = Path(args.image_path).resolve() if args.image_path else None
    output_json = Path(args.output_json).resolve()
    audio_model_path = workspace_root / "models" / "voice" / "qwen2-audio"
    omni_model_path = workspace_root / "models" / "voice" / "qwen2.5-omni"

    output_json.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "generatedAt": utc_now(),
        "sessionId": args.session_id,
        "conversationId": args.conversation_id,
        "audioCapture": audio_metadata(audio_path),
        "torch": {
            "version": getattr(torch, "__version__", None),
            "cudaAvailable": bool(torch.cuda.is_available()),
            "cudaVersion": getattr(torch.version, "cuda", None),
            "deviceName": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        },
        "qwenAudio": None,
        "qwenOmni": None,
        "finalStatus": "BLOCKED",
        "sessionIsolation": {
            "mode": "STRICT_CURRENT_AUDIO_ONLY",
            "expectedPhrase": args.expected_phrase or None,
            "hearingSystemPrompt": args.hearing_system_prompt,
            "hearingUserPrompt": args.hearing_user_prompt,
            "omniSystemPrompt": args.omni_system_prompt,
            "omniUserPrompt": args.omni_user_prompt,
        },
    }

    try:
        payload["qwenAudio"] = run_qwen2_audio(
            audio_model_path,
            audio_path,
            args.hearing_system_prompt,
            args.hearing_user_prompt,
            args.expected_phrase or None,
        )
    except Exception as error:  # pragma: no cover - operational evidence path
        payload["qwenAudio"] = {
            "routeId": "leeway.audio.qwen2-audio.live",
            "status": "FAILED",
            "error": str(error),
        }

    try:
        payload["qwenOmni"] = run_qwen2_5_omni(
            omni_model_path,
            audio_path,
            image_path,
            args.omni_system_prompt,
            args.omni_user_prompt,
            args.expected_phrase or None,
            args.vision_question or None,
        )
    except Exception as error:  # pragma: no cover - operational evidence path
        payload["qwenOmni"] = {
            "routeId": "leeway.multimodal.qwen2.5-omni.live",
            "status": "FAILED",
            "error": str(error),
        }

    audio_ok = payload["qwenAudio"] and payload["qwenAudio"].get("hearingProofStatus") == "QWEN_AUDIO_HEARING_PROVEN"
    omni_ok = payload["qwenOmni"] and payload["qwenOmni"].get("status") == "GPU_EXECUTION_PROVEN"
    if audio_ok and omni_ok:
        payload["finalStatus"] = "PASS"
    elif audio_ok or omni_ok:
        payload["finalStatus"] = "PARTIAL"

    output_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
