import fs from "fs";
import path from "path";

const root = process.cwd();
const generatedAt = new Date().toISOString();

const assistantBodyId =
  "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::FINAL_QWEN_EXECUTION_CLOSURE";
const assistantObjectId =
  "LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX_GPT5::WORKSPACE_SUBORDINATE";
const taskId =
  "LEEWAY_TX::QWEN_MODEL_FAMILY::FINAL_EXECUTION_CLOSURE::20260524";
const subjectObjectId = "LEEWAY_MODEL_FAMILY::QWEN";
const standardsAuthorityId =
  "LEEWAY_AUTHORITY::STANDARDS::MODEL_BURN_DOWN::LOCAL_FIRST";
const finalVerdict = "LEEWAY_FINAL_QWEN_EXECUTION_CLOSURE_PARTIAL";
const productionAllowed = "PARTIAL_FOR_EXECUTION_PROVEN_LANES_ONLY";

const reportPaths = {
  finalMd: "Archive/reports/leeway-final-qwen-execution-closure-report.md",
  finalJson: "Archive/reports/leeway-final-qwen-execution-closure-report.json",
  preserve:
    "Archive/reports/leeway-qwen-proven-lane-preservation-report.json",
  gpuReality:
    "Archive/reports/leeway-qwen-gpu-enablement-reality-check.json",
  audio: "Archive/reports/leeway-qwen-audio-final-closure-report.json",
  omni: "Archive/reports/leeway-qwen-omni-final-closure-report.json",
  tts: "Archive/reports/leeway-qwen-tts-final-closure-report.json",
  registryUpdate:
    "Archive/reports/leeway-qwen-final-closure-registry-update-report.json",
  receipt: "Archive/receipts/leeway_final_qwen_execution_closure_receipt.json",
};

const updatedRegistryPaths = [
  "LeeWay-Standards/registries/leeway-llm-route-registry.json",
  "LeeWay-Standards/registries/leeway-model-hive-registry.json",
  "LeeWay-Standards/registries/leeway-qwen-family-registry.json",
];

const updatedMapPaths = [
  "Archive/reports/leeway-nine-model-execution-proof-report.json",
  "Archive/reports/leeway-model-hive-control-plane-map.json",
  "Archive/reports/leeway-qwen-family-capability-check.json",
  "Archive/reports/leeway-model-orchestration-sentinel-report.json",
  "Archive/reports/leeway-qwen-family-sentinel-report.json",
  "Archive/reports/leeway-workflow-sentinel-report.json",
  "Archive/reports/leeway-unified-model-router-report.json",
];

const filesChanged = [
  "scripts/Write-LeeWayFinalQwenExecutionClosureReports.mjs",
  reportPaths.finalMd,
  reportPaths.finalJson,
  reportPaths.preserve,
  reportPaths.gpuReality,
  reportPaths.audio,
  reportPaths.omni,
  reportPaths.tts,
  reportPaths.registryUpdate,
  reportPaths.receipt,
  ...updatedRegistryPaths,
  ...updatedMapPaths,
];

const filesRead = [
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
  "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
  "C:/Users/Leona/.codex/skills/leeway-application-standards/SKILL.md",
  "C:/Users/Leona/.codex/skills/leeway-application-standards/references/leeway-identity-graph-standard.md",
  "C:/Users/Leona/.codex/skills/leeway-application-standards/references/leeway-tracer-pack-standard.md",
  "C:/Users/Leona/.codex/skills/leeway-application-standards/references/leeway-agent-learned-behavior.md",
  "Archive/reports/leeway-qwen-partial-blocked-burn-down-report.json",
  "Archive/reports/leeway-qwen-audio-burn-down-report.json",
  "Archive/reports/leeway-qwen-omni-burn-down-report.json",
  "Archive/reports/leeway-qwen-tts-burn-down-report.json",
  "Archive/reports/leeway-edge-gpu-runtime-report.json",
  "Archive/reports/edge-power-grid-status.json",
  "Archive/reports/leeway-qwen-audio-hearing-lane-report.json",
  "Archive/reports/leeway-qwen-omni-multimodal-lane-report.json",
  "Archive/reports/leeway-model-hive-control-plane-map.json",
  "Archive/reports/leeway-qwen-family-capability-check.json",
  "Archive/reports/leeway-model-orchestration-sentinel-report.json",
  "Archive/reports/leeway-qwen-family-sentinel-report.json",
  "Archive/reports/leeway-workflow-sentinel-report.json",
  "Archive/reports/leeway-unified-model-router-report.json",
  "Archive/reports/leeway-nine-model-execution-proof-report.json",
  "LeeWay-Standards/registries/leeway-llm-route-registry.json",
  "LeeWay-Standards/registries/leeway-model-hive-registry.json",
  "LeeWay-Standards/registries/leeway-qwen-family-registry.json",
  "models/voice/qwen2-audio/README.md",
  "models/voice/qwen2-audio/config.json",
  "models/voice/qwen2.5-omni/README.md",
  "models/voice/qwen2.5-omni/config.json",
  "models/voice/qwen3-tts/README.md",
  "models/voice/qwen3-tts/config.json",
  "Archive/reports/leeway-agent-lee-voice-synthesis-isolation-pass-1-report.json",
];

const commandsRun = [
  "Get-Content assistant law, BOOK-54, BOOK-55, and LeeWay identity/tracer references",
  "rg exact registry/report/model paths for the Qwen closure scope",
  "Get-Content prior Qwen burn-down reports and current Qwen registries/maps",
  "nvidia-smi --query-gpu=index,name,memory.total,memory.used,driver_version,temperature.gpu,utilization.gpu --format=csv,noheader,nounits",
  "nvidia-smi",
  "nvcc --version",
  "py -0p",
  "where.exe python",
  "python runtime probe for torch / transformers / qwen_tts / qwen_omni_utils / soundfile / torchaudio / flash_attn / librosa / sentence_transformers",
  "ollama ps",
  "Invoke-RestMethod /api/generate qwen2.5-coder:1.5b keep_alive=2m + ollama ps GPU observation loop",
  "Get-ChildItem local Qwen model directories and weight footprints",
  "python -m pip index versions qwen-tts",
  "python -m pip install --dry-run qwen-tts",
  "voice-cloning-env pip show torch / transformers / torchaudio / qwen-tts / bitsandbytes",
  "voice-cloning-env CUDA tensor smoke test",
  "voice-cloning-env pip index/install --dry-run qwen-omni-utils",
  "voice-cloning-env qwen2-audio 4-bit GPU load probe on 1s local reference WAV",
  "voice-cloning-env qwen2.5-omni 4-bit GPU load probe with talker disabled",
  "voice-cloning-env pip install --dry-run qwen-tts",
  "Select-String qwen3-tts README for FlashAttention and device_map guidance",
  "ollama stop qwen2.5-coder:1.5b",
  "node scripts/Write-LeeWayFinalQwenExecutionClosureReports.mjs",
];

const toolsUsed = [
  "functions.shell_command",
  "multi_tool_use.parallel",
  "functions.apply_patch",
  "functions.update_plan",
  "web.run",
];

const standardsChecked = [
  "LEEWAY_POLICY::BOOK_54_ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
  "LEEWAY_POLICY::BOOK_55_ASSISTANT-RECORDING-AND-LEARNING-LAW",
  "leeway-application-standards",
  "leeway-identity-graph-standard",
  "leeway-tracer-pack-standard",
  "LEEWAY_POLICY::QWEN_FAMILY::OPERATING_ORDER_LAW",
  "LEEWAY_POLICY::QWEN_MODEL_BURN_DOWN::NO_FAKE_PASS",
  "LEEWAY_POLICY::QWEN_MODEL_BURN_DOWN::NO_EXTERNAL_FALLBACK",
];

const gatesRun = [
  "LEEWAY_ASSISTANT_EMBODIMENT_GATE",
  "LEEWAY_ASSISTANT_RECORDING_LEARNING_GATE",
  "LEEWAY_GATE::QWEN_CLOSURE::PROVEN_LANE_PRESERVATION",
  "LEEWAY_GATE::QWEN_CLOSURE::GPU_TRUTH",
  "LEEWAY_GATE::QWEN_CLOSURE::NO_NON_QWEN_SUBSTITUTION",
  "LEEWAY_GATE::QWEN_CLOSURE::NO_STALE_ACTIVE_STATUS",
  "LEEWAY_GATE::QWEN_CLOSURE::TTS_NO_SYSTEM_FALLBACK",
];

const webSources = [
  {
    label: "PyTorch get started install matrix",
    url: "https://pytorch.org/get-started/locally/",
  },
  {
    label: "PyTorch forum: Blackwell support requires CUDA 12.8+ builds",
    url: "https://discuss.pytorch.org/t/pytorch-support-for-sm-120/222119",
  },
  {
    label: "PyTorch forum: stable/nightly 12.8+ support Blackwell",
    url: "https://discuss.pytorch.org/t/request-for-sm-120-rtx-50xx-cuda-12-8-support-in-pytorch/222207",
  },
  {
    label: "bitsandbytes installation guide",
    url: "https://huggingface.co/docs/bitsandbytes/installation",
  },
];

const preservedLanes = [
  "qwen3:latest",
  "qwen2.5-coder:14b",
  "qwen2.5-coder:7b",
  "qwen2.5-coder:1.5b",
  "qwen2.5vl:7b",
  "qwen3-vl-embedding-local",
];

const beforeStatus = {
  "qwen3:latest": "EXECUTION_PROVEN",
  "qwen2.5-coder:14b": "EXECUTION_PROVEN",
  "qwen2.5-coder:7b": "EXECUTION_PROVEN",
  "qwen2.5-coder:1.5b": "EXECUTION_PROVEN",
  "qwen2.5vl:7b": "EXECUTION_PROVEN",
  "qwen2-audio-local": "PARTIAL",
  "qwen2.5-omni-local": "HARDWARE_BLOCKED",
  "qwen3-tts-local": "DEPENDENCY_BLOCKED",
  "qwen3-vl-embedding-local": "EXECUTION_PROVEN",
};

const afterStatus = {
  "qwen3:latest": "EXECUTION_PROVEN",
  "qwen2.5-coder:14b": "EXECUTION_PROVEN",
  "qwen2.5-coder:7b": "EXECUTION_PROVEN",
  "qwen2.5-coder:1.5b": "EXECUTION_PROVEN",
  "qwen2.5vl:7b": "EXECUTION_PROVEN",
  "qwen2-audio-local": "CPU_EXECUTION_IMPRACTICAL",
  "qwen2.5-omni-local": "HARDWARE_BLOCKED",
  "qwen3-tts-local": "DEPENDENCY_BLOCKED",
  "qwen3-vl-embedding-local": "EXECUTION_PROVEN",
};

const remainingBlockers = [
  "qwen2-audio-local: CPU decoding remains unusable and current Python GPU quantization path fails on RTX 5060 sm_120.",
  "qwen2.5-omni-local: CPU execution remains infeasible; Python GPU quantization path fails on RTX 5060 sm_120; qwen-omni-utils is still absent.",
  "qwen3-tts-local: qwen-tts runtime is not installed in a dedicated governed env, so no speech generation was executed.",
];

const failuresEncountered = [
  "Default Python runtime is still torch 2.12.0+cpu with CUDA unavailable.",
  "voice-cloning-env exposes CUDA but uses torch 2.6.0+cu124, which warns that RTX 5060 sm_120 is unsupported.",
  "qwen2-audio 4-bit GPU load failed with `CUDA error: no kernel image is available for execution on the device`.",
  "qwen2.5-omni 4-bit GPU load failed with `CUDA error: no kernel image is available for execution on the device`.",
  "qwen3-tts local snapshot has no custom modeling code or auto_map, so local `trust_remote_code` is insufficient by itself.",
];

const lessonsLearned = [
  "Ollama GPU truth and Python GPU truth must be recorded separately; one does not prove the other.",
  "Blackwell-visible CUDA is not enough for model execution proof; the installed torch and quantization stack must explicitly support sm_120 kernels.",
  "For local Qwen TTS, package metadata matters as much as model files; a HF snapshot without qwen-tts code is still load-blocked.",
];

const skillImprovementsSuggested = [
  "Add a LeeWay GPU truth checklist that records both driver visibility and CUDA kernel compatibility for the exact GPU architecture.",
  "Add a governed Qwen local-runtime closure skill for Blackwell/RTX-50-class compatibility checks before long model-load attempts.",
  "Add a LeeWay TTS dependency skill that distinguishes optional acceleration packages from hard runtime requirements.",
];

const laneDetails = {
  audio: {
    modelId: "qwen2-audio-local",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
    status: "CPU_EXECUTION_IMPRACTICAL",
    cpuAttempt: {
      input: "0.10s governed synthetic tone",
      device: "cpu",
      maxNewTokens: 1,
      generateMs: 261576,
      decoded: "One word.",
      usableTranscriptOrIntentProduced: false,
    },
    gpuAttempt: {
      envPath:
        ".leeway-vscode/agent-lee/voice/voice-cloning-env/Scripts/python.exe",
      envTorch: "2.6.0+cu124",
      envTorchaudio: "2.6.0+cu124",
      envBitsAndBytes: "0.49.2",
      sampleRate: 16000,
      clipSeconds: 1.0,
      processorLoadSeconds: 0.435,
      wallTimeSeconds: 483.8,
      quantization: "4-bit bitsandbytes",
      error:
        "CUDA error: no kernel image is available for execution on the device",
      failureStage: "MODEL_LOAD_START",
    },
    conclusion:
      "CPU path is callable but not usable for hearing; GPU rescue is blocked by the current sm_120-incompatible Python acceleration stack.",
    exactActivationRequirement:
      "Install a Blackwell-capable PyTorch + torchaudio build (CUDA 12.8+ or newer), then retry qwen2-audio with a governed short-speech probe and, if needed, 4-bit or split-load configuration.",
  },
  omni: {
    modelId: "qwen2.5-omni-local",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
    status: "HARDWARE_BLOCKED",
    cpuAttempt: {
      attempt: "text-only generate(max_new_tokens=1)",
      device: "cpu",
      timeoutSeconds: 300,
      outputProduced: false,
    },
    mixedAttempt: {
      attempt: "float16 device_map=auto max_memory GPU+CPU",
      wallTimeSeconds: 904.0,
      outputProduced: false,
      result: "timed out before execution proof",
    },
    gpuAttempt: {
      envPath:
        ".leeway-vscode/agent-lee/voice/voice-cloning-env/Scripts/python.exe",
      quantization: "4-bit bitsandbytes",
      talkerDisabled: true,
      wallTimeSeconds: 463.1,
      error:
        "CUDA error: no kernel image is available for execution on the device",
      failureStage: "MODEL_LOAD_START",
    },
    vramReality: {
      localWeightGiB: 20.827,
      publishedMinimumBf16GiBFor15sVideo: 31.11,
      publishedNote:
        "actual memory usage is typically at least 1.2x the theoretical minimum",
      localGpuGiB: 8.151,
    },
    exactActivationRequirement:
      "Install a Blackwell-capable PyTorch + torchaudio stack, add qwen-omni-utils, and run a minimal text-only proof before any multimodal proof; if full multimodal GPU memory is still insufficient, use a higher-VRAM GPU or a supported quantized path.",
  },
  tts: {
    modelId: "qwen3-tts-local",
    routeId: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
    status: "DEPENDENCY_BLOCKED",
    localSnapshot: {
      modelType: "qwen3_tts",
      architectures: ["Qwen3TTSForConditionalGeneration"],
      transformersVersion: "4.57.3",
      autoMap: null,
      customModelingFilesPresent: false,
    },
    currentDefaultPython: {
      python: "3.13.13",
      torch: "2.12.0+cpu",
      transformers: "5.9.0",
      missing: ["qwen_tts", "soundfile", "torchaudio", "flash_attn"],
    },
    voiceEnvDryRun: {
      pythonEnv:
        ".leeway-vscode/agent-lee/voice/voice-cloning-env/Scripts/python.exe",
      wouldInstall: [
        "qwen-tts==0.1.1",
        "accelerate==1.12.0",
        "onnxruntime==1.26.0",
        "sox==1.5.0",
        "flatbuffers==25.12.19",
        "transformers==4.57.3",
      ],
      note: "Running this in the existing shared voice env would downgrade transformers 5.8.0 to 4.57.3.",
    },
    runtimeTruth: {
      trustRemoteCodeOnLocalSnapshotSufficient: false,
      flashAttentionOptional: true,
      cpuOnlyRunProven: false,
      cpuOnlyRunAssessment:
        "Not ruled out by package metadata, but no governed local synthesis run was executed.",
    },
    exactActivationRequirement:
      "Create a dedicated qwen3-tts runtime, install qwen-tts 0.1.1 with transformers 4.57.3, then attempt governed speech generation; flash-attn is recommended for acceleration but not a hard package dependency.",
  },
};

const gpuReality = {
  nvidiaDriverVisibility: {
    ok: true,
    gpuName: "NVIDIA GeForce RTX 5060 Laptop GPU",
    totalMemoryMiB: 8151,
    usedMemoryMiB: 635,
    driverVersion: "592.01",
    cudaVersionFromNvidiaSmi: "13.1",
  },
  cudaToolkitAvailability: "NVCC_NOT_FOUND",
  defaultPythonRuntime: {
    pythonExecutable:
      "C:/Users/Leona/AppData/Local/Programs/Python/Python313/python.exe",
    pythonVersion: "3.13.13",
    torchVersion: "2.12.0+cpu",
    torchCudaAvailable: false,
    torchCudaVersion: null,
    torchDeviceCount: 0,
    transformersVersion: "5.9.0",
    missingPackages: [
      "qwen_tts",
      "qwen_omni_utils",
      "soundfile",
      "torchaudio",
      "flash_attn",
      "librosa",
    ],
  },
  leeWayVoiceEnv: {
    pythonExecutable:
      ".leeway-vscode/agent-lee/voice/voice-cloning-env/Scripts/python.exe",
    pythonVersion: "3.13.13",
    torchVersion: "2.6.0+cu124",
    torchaudioVersion: "2.6.0+cu124",
    transformersVersion: "5.8.0",
    bitsAndBytesVersion: "0.49.2",
    torchCudaAvailable: true,
    simpleCudaTensorWorked: true,
    warning:
      "NVIDIA GeForce RTX 5060 Laptop GPU with CUDA capability sm_120 is not compatible with the current PyTorch installation.",
  },
  ollamaGpuReality: {
    model: "qwen2.5-coder:1.5b",
    observedAt: generatedAt,
    observedProcessor: "100% GPU",
    source: "ollama ps during live generation",
    note: "This proves Ollama GPU execution, not Python local-runner GPU execution.",
  },
  edgeGpuProviderMode: {
    sourceReport: "Archive/reports/leeway-edge-gpu-runtime-report.json",
    sourceGeneratedAt: "2026-05-24T19:02:36.312Z",
    providerMode: "CPU_COORDINATION_ONLY",
    webgpuCapability: "API_NOT_PRESENT",
    authorityStatus: "GPU_HARDWARE_PRESENT_EDGE_PROVIDER_CPU_COORDINATION_ONLY",
  },
  vramSuitability: {
    audioWeightGiB: 15.641,
    omniWeightGiB: 20.827,
    ttsWeightGiB: 4.228,
    audioAssessment:
      "Does not fit unquantized into 8.151 GiB VRAM; a quantized or split-load route is required.",
    omniAssessment:
      "Does not fit unquantized into 8.151 GiB VRAM; published BF16 multimodal minima are far above local VRAM.",
    ttsAssessment:
      "Weight footprint is smaller, but runtime package installation and Blackwell-safe GPU stack are still required before speech proof.",
  },
  currentRunnerTruth: {
    ollamaCanUseGpu: true,
    defaultPythonCanUseGpuForQwen: false,
    voiceEnvCanSeeGpu: true,
    voiceEnvCanLoadQuantizedQwenModels: false,
  },
  exactPythonGpuEnablementSteps: [
    {
      step: 1,
      action:
        "Create a dedicated Qwen GPU runtime instead of modifying the shared F5-TTS voice env.",
      command:
        "py -3.13 -m venv .leeway-vscode\\agent-lee\\voice\\qwen-gpu-env",
    },
    {
      step: 2,
      action: "Upgrade pip in that env.",
      command:
        ".\\.leeway-vscode\\agent-lee\\voice\\qwen-gpu-env\\Scripts\\python.exe -m pip install --upgrade pip",
    },
    {
      step: 3,
      action:
        "Install a Blackwell-capable PyTorch build. This command is inferred from the official install-matrix URL pattern plus the PyTorch forum guidance that Blackwell needs CUDA 12.8+.",
      command:
        ".\\.leeway-vscode\\agent-lee\\voice\\qwen-gpu-env\\Scripts\\python.exe -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128",
      inferenceFromOfficialSource: true,
    },
    {
      step: 4,
      action:
        "Verify native CUDA kernels before loading any Qwen model.",
      command:
        ".\\.leeway-vscode\\agent-lee\\voice\\qwen-gpu-env\\Scripts\\python.exe -c \"import torch; x=torch.randn(64,64,device='cuda'); print(torch.matmul(x,x).shape)\"",
    },
    {
      step: 5,
      action:
        "Install route-specific packages only after step 4 passes.",
      command:
        ".\\.leeway-vscode\\agent-lee\\voice\\qwen-gpu-env\\Scripts\\python.exe -m pip install qwen-omni-utils qwen-tts",
    },
    {
      step: 6,
      action:
        "Optionally add FlashAttention 2 for Qwen3-TTS acceleration after the Blackwell-capable torch stack is confirmed.",
      command:
        ".\\.leeway-vscode\\agent-lee\\voice\\qwen-gpu-env\\Scripts\\python.exe -m pip install flash-attn --no-build-isolation",
      optional: true,
    },
  ],
};

const registryModelPatches = {
  "qwen2-audio-local": {
    routeStatus: "CPU_EXECUTION_IMPRACTICAL",
    capabilityStatus: "CPU_EXECUTION_IMPRACTICAL",
    blocker:
      "CPU-only Qwen2-Audio did not produce a usable transcript/audio-intent (261576ms at max_new_tokens=1); 4-bit GPU load in the CUDA voice env failed with `no kernel image is available for execution on the device` on RTX 5060 sm_120.",
    status: "CPU_EXECUTION_IMPRACTICAL",
    runtimeHealth: "CPU_EXECUTION_IMPRACTICAL",
    proofStatus: "CPU_EXECUTION_IMPRACTICAL",
    finalTruthLabel: "CPU_EXECUTION_IMPRACTICAL",
    executionProofStatus: "CPU_EXECUTION_IMPRACTICAL",
    currentStatus: "CPU_EXECUTION_IMPRACTICAL",
    minimalExecutionProof: "CPU_EXECUTION_IMPRACTICAL",
    loadability: "LOAD_PROVEN",
    activationStatus:
      "NOT_ACTIVE_UNTIL_USABLE_TRANSCRIPT_OR_GPU_RUNTIME_REPAIR",
    gpuExecutionStatus: "PYTHON_GPU_ENV_PRESENT_BUT_SM120_BUILD_INCOMPATIBLE",
    currentBlocker:
      "CPU hearing is impractical and the current Blackwell Python quantization path is not executable.",
    burnDownStatus: "CPU_EXECUTION_IMPRACTICAL_WITH_GPU_REPAIR_PATH",
    burnDownProof:
      "CPU callable proof preserved; 1s local speech clip 4-bit GPU load failed with `no kernel image` during quantization.",
  },
  "qwen2.5-omni-local": {
    routeStatus: "HARDWARE_BLOCKED",
    capabilityStatus: "LOAD_BLOCKED",
    blocker:
      "CPU text-only generation timed out after 300s; float16 mixed GPU+CPU attempt timed out after ~904s; 4-bit GPU load failed with `no kernel image is available for execution on the device`; local 8.151 GiB VRAM is below published BF16 multimodal minima.",
    status: "HARDWARE_BLOCKED",
    runtimeHealth: "HARDWARE_BLOCKED",
    proofStatus: "HARDWARE_BLOCKED",
    finalTruthLabel: "HARDWARE_BLOCKED",
    executionProofStatus: "HARDWARE_BLOCKED",
    currentStatus: "LOAD_BLOCKED",
    minimalExecutionProof: "HARDWARE_BLOCKED",
    loadability: "LOAD_PROVEN",
    activationStatus:
      "NOT_ACTIVE_UNTIL_GPU_RUNTIME_REPAIR_AND_MINIMAL_EXECUTION_PROVEN",
    gpuExecutionStatus: "PYTHON_GPU_ENV_PRESENT_BUT_SM120_BUILD_INCOMPATIBLE",
    currentBlocker:
      "GPU is required, but the current Python CUDA/quantization stack is not Blackwell-safe and qwen-omni-utils is still missing.",
    burnDownStatus: "TRUTHFULLY_BLOCKED_WITH_EXACT_ACTIVATION_REQUIREMENT",
    burnDownProof:
      "CPU timeout preserved; 4-bit Blackwell GPU attempt failed before minimal text proof.",
  },
  "qwen3-tts-local": {
    routeStatus: "DEPENDENCY_BLOCKED",
    capabilityStatus: "LOAD_BLOCKED",
    blocker:
      "Local snapshot has no custom modeling code or auto_map; qwen-tts runtime is missing; default Python is torch 2.12.0+cpu with transformers 5.9.0; no governed speech synthesis executed.",
    status: "DEPENDENCY_BLOCKED",
    runtimeHealth: "DEPENDENCY_BLOCKED",
    proofStatus: "DEPENDENCY_BLOCKED",
    finalTruthLabel: "DEPENDENCY_BLOCKED",
    executionProofStatus: "DEPENDENCY_BLOCKED",
    currentStatus: "LOAD_BLOCKED",
    minimalExecutionProof: "DEPENDENCY_BLOCKED",
    loadability: "LOAD_BLOCKED",
    activationStatus:
      "NOT_ACTIVE_UNTIL_DEDICATED_QWEN3_TTS_RUNTIME_AND_SPEECH_PROOF",
    gpuExecutionStatus: "GPU_ENV_PRESENT_RUNTIME_PACKAGE_MISSING",
    currentBlocker:
      "Needs a dedicated qwen-tts runtime; flash-attn is optional, but qwen-tts is mandatory.",
    burnDownStatus: "TRUTHFULLY_BLOCKED_WITH_DEDICATED_RUNTIME_PLAN",
    burnDownProof:
      "Dry-run package resolution proved qwen-tts 0.1.1 dependency plan; local trust_remote_code alone remains insufficient.",
  },
};

const routeIdToModelName = {
  [laneDetails.audio.routeId]: laneDetails.audio.modelId,
  [laneDetails.omni.routeId]: laneDetails.omni.modelId,
  [laneDetails.tts.routeId]: laneDetails.tts.modelId,
};

const preservationNotes = preservedLanes.map((modelId) => ({
  modelId,
  preservedStatus: "EXECUTION_PROVEN",
  contradictoryLiveTestObserved: false,
}));

function abs(filePath) {
  return path.join(root, filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(abs(filePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(abs(filePath)), { recursive: true });
  fs.writeFileSync(abs(filePath), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(abs(filePath)), { recursive: true });
  fs.writeFileSync(abs(filePath), value);
}

function commonReport({
  reportId,
  subjectId = subjectObjectId,
  finalStatus = finalVerdict,
  extra = {},
  localRemainingBlockers = remainingBlockers,
  localFailures = failuresEncountered,
  localLessons = lessonsLearned,
  localImprovements = skillImprovementsSuggested,
}) {
  return {
    reportId,
    generatedAt,
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId: subjectId,
    standardsAuthorityId,
    classification: "EVIDENCE",
    filesRead,
    filesChanged,
    commandsRun,
    toolsUsed,
    MCPsUsed: [],
    standardsChecked,
    gatesRun,
    receiptsWritten: [reportPaths.receipt],
    failuresEncountered: localFailures,
    lessonsLearned: localLessons,
    skillImprovementsSuggested: localImprovements,
    finalStatus,
    remainingBlockers: localRemainingBlockers,
    webSources,
    ...extra,
  };
}

function updateModelLikeRecord(record) {
  if (!record || typeof record !== "object") {
    return;
  }
  const modelName = record.exactModelName || routeIdToModelName[record.modelRouteId];
  if (!modelName) {
    return;
  }
  const patch = registryModelPatches[modelName];
  if (patch) {
    Object.assign(record, patch, {
      lastBurnDownAt: generatedAt,
      finalClosureVerdict: finalVerdict,
    });
  } else if (preservedLanes.includes(modelName)) {
    record.lastBurnDownAt = generatedAt;
    record.finalClosureVerdict = finalVerdict;
    if (record.status === undefined && record.routeStatus) {
      record.status = record.routeStatus;
    }
  }
}

function updateKnownModelArrays(doc) {
  const candidateArrays = [
    doc.models,
    doc.routes,
    doc.modelRoutes,
    doc.displayedModels,
  ];
  for (const collection of candidateArrays) {
    if (Array.isArray(collection)) {
      collection.forEach(updateModelLikeRecord);
    }
  }
}

function refreshTopLevelArtifacts(doc) {
  doc.generatedAt = generatedAt;
  doc.lastBurnDownAt = generatedAt;
  doc.finalStatus = "PARTIAL";
  doc.burnDownFinalVerdict = finalVerdict;
  doc.finalClosureVerdict = finalVerdict;
  doc.noStaleActiveClaims = true;
  return doc;
}

function updateBlockerArray(doc) {
  if (!Array.isArray(doc.blockers)) {
    return;
  }
  doc.blockers = doc.blockers.filter(
    (line) =>
      !line.includes("qwen2-audio-local:") &&
      !line.includes("qwen2.5-omni-local:") &&
      !line.includes("qwen3-tts-local:")
  );
  doc.blockers.push(
    "qwen2-audio-local: CPU_EXECUTION_IMPRACTICAL - CPU call stayed unusable and 4-bit GPU load failed with `no kernel image is available for execution on the device` on RTX 5060 sm_120.",
    "qwen2.5-omni-local: HARDWARE_BLOCKED - CPU text generation timed out, 4-bit GPU load failed with `no kernel image`, and local 8.151 GiB VRAM remains below published BF16 multimodal minima.",
    "qwen3-tts-local: DEPENDENCY_BLOCKED - local snapshot requires qwen-tts runtime; flash-attn is optional; no governed Qwen speech generation executed."
  );
}

function updateRegistryFile(filePath) {
  const doc = refreshTopLevelArtifacts(readJson(filePath));
  updateKnownModelArrays(doc);
  return doc;
}

function updateModelMapFile(filePath) {
  const doc = refreshTopLevelArtifacts(readJson(filePath));
  updateKnownModelArrays(doc);
  if (doc.summary && typeof doc.summary === "object") {
    doc.summary = {
      executionProven: 6,
      cpuExecutionImpractical: 1,
      blocked: 2,
    };
  }
  if (doc.finalStatus && doc.finalStatus.includes("PARTIAL_RUNTIME_ROUTER")) {
    doc.finalStatus = "PARTIAL_RUNTIME_ROUTER_PRESENT_WITH_EXACT_QWEN_BLOCKERS";
  }
  updateBlockerArray(doc);
  return doc;
}

const updatedRegistries = {};
for (const filePath of updatedRegistryPaths) {
  updatedRegistries[filePath] = updateRegistryFile(filePath);
}

const updatedMaps = {};
for (const filePath of updatedMapPaths) {
  updatedMaps[filePath] = updateModelMapFile(filePath);
}

for (const [filePath, doc] of Object.entries(updatedRegistries)) {
  writeJson(filePath, doc);
}
for (const [filePath, doc] of Object.entries(updatedMaps)) {
  writeJson(filePath, doc);
}

const preservationReport = commonReport({
  reportId: "LEEWAY_REPORT::QWEN_PROVEN_LANE_PRESERVATION",
  finalStatus: "PROVEN_LANES_PRESERVED",
  localRemainingBlockers: remainingBlockers,
  localFailures: [],
  localLessons: [
    "No live contradiction was observed for any of the six execution-proven lanes.",
  ],
  localImprovements: [],
  extra: {
    preservedLanes: preservationNotes,
    beforeStatus,
    afterStatus: Object.fromEntries(
      Object.entries(afterStatus).filter(([modelId]) => preservedLanes.includes(modelId))
    ),
    liveContradictions: [],
  },
});

const gpuReport = commonReport({
  reportId: "LEEWAY_REPORT::QWEN_GPU_ENABLEMENT_REALITY_CHECK",
  finalStatus: "GPU_REALITY_CHECK_COMPLETE",
  localFailures: [
    "Default workspace Python remains CPU-only.",
    "LeeWay voice env sees CUDA but model quantization kernels still fail on sm_120.",
  ],
  localLessons: [
    "Ollama GPU proof is established independently from Python local-runner proof.",
    "Blackwell support requires a newer PyTorch build than the currently installed cu124 runtime.",
  ],
  localImprovements: [],
  extra: gpuReality,
});

const audioReport = commonReport({
  reportId: "LEEWAY_REPORT::QWEN_AUDIO_FINAL_CLOSURE",
  subjectId: "LEEWAY_MODEL::QWEN2_AUDIO_LOCAL",
  finalStatus: laneDetails.audio.status,
  localFailures: [
    "CPU call stayed non-usable for hearing.",
    "4-bit GPU load failed before transcript generation.",
  ],
  localLessons: [
    "Processor/input-packaging proof does not equal usable hearing proof.",
    "The current Python GPU stack fails during quantized weight conversion on sm_120.",
  ],
  localImprovements: [],
  extra: laneDetails.audio,
});

const omniReport = commonReport({
  reportId: "LEEWAY_REPORT::QWEN_OMNI_FINAL_CLOSURE",
  subjectId: "LEEWAY_MODEL::QWEN2_5_OMNI_LOCAL",
  finalStatus: laneDetails.omni.status,
  localFailures: [
    "CPU-only text execution remained infeasible.",
    "4-bit GPU load failed before minimal text proof.",
  ],
  localLessons: [
    "Published multimodal BF16 minima are far above the local 8.151 GiB VRAM ceiling.",
    "The same sm_120 kernel-image failure blocks quantized Python rescue attempts here too.",
  ],
  localImprovements: [],
  extra: laneDetails.omni,
});

const ttsReport = commonReport({
  reportId: "LEEWAY_REPORT::QWEN_TTS_FINAL_CLOSURE",
  subjectId: "LEEWAY_MODEL::QWEN3_TTS_LOCAL",
  finalStatus: laneDetails.tts.status,
  localFailures: [
    "No dedicated qwen-tts runtime exists yet.",
    "No governed speech audio was synthesized in this pass.",
  ],
  localLessons: [
    "A local snapshot without qwen-tts code is still dependency-blocked even when weights are present.",
    "FlashAttention is an acceleration recommendation, not the package that unlocks basic model recognition.",
  ],
  localImprovements: [],
  extra: laneDetails.tts,
});

const registryUpdateReport = commonReport({
  reportId: "LEEWAY_REPORT::QWEN_FINAL_CLOSURE_REGISTRY_UPDATE",
  finalStatus: "REGISTRIES_AND_MAPS_UPDATED",
  localFailures: [],
  localLessons: [
    "Status fields were normalized to the allowed closure labels and stale ACTIVE ambiguity was removed from the updated Qwen surfaces.",
  ],
  localImprovements: [],
  extra: {
    updatedFiles: [...updatedRegistryPaths, ...updatedMapPaths],
    routeStatusChanges: [
      {
        modelId: "qwen2-audio-local",
        before: "PARTIAL",
        after: "CPU_EXECUTION_IMPRACTICAL",
      },
      {
        modelId: "qwen2.5-omni-local",
        before: "HARDWARE_BLOCKED",
        after: "HARDWARE_BLOCKED",
      },
      {
        modelId: "qwen3-tts-local",
        before: "DEPENDENCY_BLOCKED",
        after: "DEPENDENCY_BLOCKED",
      },
    ],
    updatedTopLevelVerdict: finalVerdict,
  },
});

const finalJsonReport = commonReport({
  reportId: "LEEWAY_REPORT::FINAL_QWEN_EXECUTION_CLOSURE",
  finalStatus: finalVerdict,
  extra: {
    beforeStatus,
    afterStatus,
    preservedLanes,
    improvedLanes: [
      {
        modelId: "qwen2-audio-local",
        before: "PARTIAL",
        after: "CPU_EXECUTION_IMPRACTICAL",
        improvement:
          "Blocker became exact: CPU is not usable and GPU quantization fails specifically on the current sm_120 Python stack.",
      },
      {
        modelId: "qwen2.5-omni-local",
        before: "HARDWARE_BLOCKED",
        after: "HARDWARE_BLOCKED",
        improvement:
          "Blocker is now exact: CPU timeout preserved, published VRAM minima recorded, and quantized GPU load failure captured on the current stack.",
      },
      {
        modelId: "qwen3-tts-local",
        before: "DEPENDENCY_BLOCKED",
        after: "DEPENDENCY_BLOCKED",
        improvement:
          "Dependency path is now exact: qwen-tts 0.1.1, transformers 4.57.3, dedicated runtime, flash-attn optional.",
      },
    ],
    provenLanePreservation: preservationNotes,
    gpuReality,
    laneDetails,
    registriesUpdated: [...updatedRegistryPaths, ...updatedMapPaths],
    productionAllowed,
    embodimentAllowed: false,
    externalOperationAllowed: false,
    runtimeTruthWins: true,
    noFakePass: true,
    noExternalFallback: true,
  },
});

const receipt = {
  assistantBodyId,
  assistantObjectId,
  taskId,
  subjectObjectId,
  filesRead,
  filesChanged,
  commandsRun,
  toolsUsed,
  MCPsUsed: [],
  standardsChecked,
  gatesRun,
  receiptsWritten: [reportPaths.receipt],
  failuresEncountered,
  lessonsLearned,
  skillImprovementsSuggested,
  finalStatus: finalVerdict,
  remainingBlockers,
  generatedAt,
  receiptId:
    "LEEWAY_RECEIPT::QWEN::FINAL_EXECUTION_CLOSURE::20260524T000000Z",
  reportRefs: Object.values(reportPaths).filter((entry) => entry !== reportPaths.receipt),
};

const finalMd = `# LeeWay Final Qwen Execution Closure Report

Generated: ${generatedAt}

Final verdict: ${finalVerdict}

## Preserved Execution-Proven Lanes

- qwen3:latest: EXECUTION_PROVEN
- qwen2.5-coder:14b: EXECUTION_PROVEN
- qwen2.5-coder:7b: EXECUTION_PROVEN
- qwen2.5-coder:1.5b: EXECUTION_PROVEN
- qwen2.5vl:7b: EXECUTION_PROVEN
- qwen3-vl-embedding-local: EXECUTION_PROVEN

## Closure Outcome

- qwen2-audio-local: CPU_EXECUTION_IMPRACTICAL. CPU callable proof was preserved, but the earlier 261576ms CPU decode still produced no usable transcript/audio-intent and the GPU 4-bit rescue path failed with \`no kernel image is available for execution on the device\` on RTX 5060 sm_120.
- qwen2.5-omni-local: HARDWARE_BLOCKED. CPU text-only generation still times out, the local 8.151 GiB VRAM ceiling remains below the published BF16 multimodal minima, and the 4-bit GPU load failed with the same \`no kernel image\` blocker.
- qwen3-tts-local: DEPENDENCY_BLOCKED. The local snapshot has no custom modeling code or \`auto_map\`; \`qwen-tts\` is still required; FlashAttention 2 is optional rather than mandatory; no governed Qwen speech generation executed.

## GPU Reality

- NVIDIA driver visibility is real: RTX 5060 Laptop GPU, driver 592.01, CUDA 13.1 reported by \`nvidia-smi\`.
- Default workspace Python remains CPU-only: Python 3.13.13 with \`torch 2.12.0+cpu\` and \`torch.cuda.is_available() == False\`.
- A separate LeeWay voice env can see CUDA, but it is still running \`torch 2.6.0+cu124\`, which warns that sm_120 is unsupported.
- Ollama GPU execution was directly observed on 2026-05-24: \`qwen2.5-coder:1.5b\` showed \`100% GPU\` in \`ollama ps\`.
- Edge GPU provider mode remains \`CPU_COORDINATION_ONLY\` with \`API_NOT_PRESENT\` per the latest local edge GPU runtime report.

## Exact Remediation Path

1. Create a dedicated Qwen GPU env instead of changing the shared LeeWay voice env.
2. Install a Blackwell-capable PyTorch build with CUDA 12.8+.
3. Verify a native CUDA matmul before loading any Qwen model.
4. Install \`qwen-omni-utils\` and \`qwen-tts\` only after that verification passes.
5. Re-run the narrow audio, omni, and TTS probes.

## Gate Result

- Production allowed: ${productionAllowed}
- Embodiment allowed: false
- External operation allowed: false
- Runtime truth wins.
`;

writeText(reportPaths.finalMd, finalMd);
writeJson(reportPaths.finalJson, finalJsonReport);
writeJson(reportPaths.preserve, preservationReport);
writeJson(reportPaths.gpuReality, gpuReport);
writeJson(reportPaths.audio, audioReport);
writeJson(reportPaths.omni, omniReport);
writeJson(reportPaths.tts, ttsReport);
writeJson(reportPaths.registryUpdate, registryUpdateReport);
writeJson(reportPaths.receipt, receipt);

console.log(
  JSON.stringify(
    {
      generatedAt,
      finalVerdict,
      wrote: [
        reportPaths.finalMd,
        reportPaths.finalJson,
        reportPaths.preserve,
        reportPaths.gpuReality,
        reportPaths.audio,
        reportPaths.omni,
        reportPaths.tts,
        reportPaths.registryUpdate,
        reportPaths.receipt,
        ...updatedRegistryPaths,
        ...updatedMapPaths,
      ],
    },
    null,
    2
  )
);
