$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$KnowledgeRoot = Join-Path $Root "Archive\agent-lee-artifacts\agent-lee-3d-knowledge"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-3d-knowledge"
$RuntimeDir = Join-Path $Root "runtime"

New-Item -ItemType Directory -Force -Path $KnowledgeRoot | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$DoctrinePath = Join-Path $KnowledgeRoot "AGENT_LEE_IMAGE_TO_3D_DOCTRINE.md"
$KnowledgeJsonPath = Join-Path $KnowledgeRoot "agent-lee-3d-knowledge-base.json"
$ToolRegistryPath = Join-Path $KnowledgeRoot "agent-lee-3d-tool-registry.json"
$PromptRulesPath = Join-Path $KnowledgeRoot "agent-lee-3d-prompt-rules.json"
$ValidationSchemaPath = Join-Path $KnowledgeRoot "agent-lee-3d-validation-schema.json"
$RuntimeManifestPath = Join-Path $RuntimeDir "agent-lee-3d-skill-pipeline.manifest.json"

@"
# Agent Lee Image-to-3D Doctrine

## Prime Rule

Agent Lee must not claim a 2D image, relief card, shell mesh, or distorted blob is a finished 3D character.

A valid Agent Lee 3D character must be:
- recognizable as the requested character
- full body
- rotatable
- textured
- exported as GLB or OBJ
- not a flat card
- not a red block
- not a relief surface
- not a shell cutout
- not missing major parts

## Current Learned Failure Cases

The following inputs must be rejected for final 3D:

- cinematic castle scene
- archway background
- dramatic poster image
- single front image treated as full turnaround
- four separately generated characters
- cropped single-sheet panels
- wing-only panels
- feather wings when dragon wings are required
- missing sword
- missing tail
- missing feet
- merged body/background
- blocky red object
- TripoSR blob output

## Accepted Source Standard

For high-quality final 3D, Agent Lee should prefer one of these:

### Best
A consistent single-character turnaround sheet with:
- front view
- left side view
- right side view
- back view
- same character across all panels
- same armor
- same horns
- same wings
- same tail
- same sword
- plain background

### Acceptable Preview
A clean single front image can be used for Hunyuan3D/TRELLIS preview, but not as proof of final multi-view correctness.

### Rejected
Text-only SDXL four separate generations are rejected unless a visual audit confirms the same character across all views.

## Backend Rules

TripoSR:
- fast proof only
- not final quality
- fails on cinematic/poster images
- fails on inconsistent source views

Hunyuan3D / TRELLIS:
- preferred final image-to-3D backend
- should receive clean front image or validated turnaround source
- should output GLB/OBJ and texture assets

## LLM Role

The LLM is not the mesh generator.

The LLM must:
- understand the request
- choose the proper pipeline
- reject bad sources
- call tools in sequence
- write strict JSON plans
- inspect receipts
- request reruns when standards fail

## Tool Role

Tools must:
- preprocess images
- generate source views
- reconstruct 3D
- clean meshes
- bake textures
- export GLB
- validate output
- write receipts

## Full-Live Runtime Rule

Do not shut down Agent Lee live lanes for normal 3D work.

Keep live:
- Telegram shell
- Telegram vision
- vision kernel
- voice/ears when stable
- runtime fabric
- code mode

Serialize heavy jobs:
- SDXL image generation
- Hunyuan3D/TRELLIS
- TripoSR
- mesh cleanup
"@ | Set-Content -Path $DoctrinePath -Encoding UTF8

$Knowledge = @{
  name = "agent_lee_image_to_3d_knowledge_base"
  version = "1.0.0"
  purpose = "Teach Agent Lee how to reason about image generation, source-pack quality, and image-to-3D pipeline selection."
  learned_failures = @(
    @{
      id = "sdxl_four_separate_views_failed"
      lesson = "Four separate SDXL jobs produced four different characters."
      decision = "Do not trust separate text-only generations as a final turnaround pack."
    },
    @{
      id = "single_sheet_split_failed"
      lesson = "Single SDXL sheet produced cropped wings and partial bodies."
      decision = "Reject cropped panels and wing-only panels."
    },
    @{
      id = "triposr_cinematic_failed"
      lesson = "TripoSR turned cinematic reference images into blobs/blocks."
      decision = "Use TripoSR only for fast proof after clean source exists."
    },
    @{
      id = "prompt_planner_reintroduced_scene"
      lesson = "The SDXL planner previously added castle/dark fantasy scene language."
      decision = "3D source prompts must forbid scenery, castle, archway, poster lighting, and floor shadows."
    }
  )
  source_acceptance_rules = @{
    required_for_final_turnaround = @(
      "same character across all views",
      "front view",
      "left side view",
      "right side view",
      "back view",
      "plain neutral background",
      "full body visible",
      "leathery dragon wings",
      "reptile tail",
      "visible sword",
      "consistent armor",
      "consistent horns"
    )
    reject_if = @(
      "different characters",
      "cropped body",
      "wing-only panel",
      "missing sword",
      "missing tail",
      "feather wings",
      "bird tail",
      "castle background",
      "archway",
      "cinematic scene",
      "poster composition",
      "red block",
      "blob",
      "relief card",
      "flat shell"
    )
  }
  backend_policy = @{
    triposr = @{
      role = "fast_preview_only"
      final_quality = $false
      use_when = "clean source exists and quick proof is needed"
      avoid_when = "source is cinematic, cropped, inconsistent, or has background scene"
    }
    hunyuan3d = @{
      role = "preferred_final_image_to_3d_backend"
      final_quality = $true
      use_when = "single clean front image or validated source pack exists"
    }
    trellis = @{
      role = "preferred_final_or_refinement_backend"
      final_quality = $true
      use_when = "higher quality reconstruction or refinement is needed"
    }
  }
  live_runtime_policy = @{
    keep_live = @(
      "agent-lee-telegram-shell",
      "agent-lee-telegram-vision-lane",
      "agent-lee-vision-kernel",
      "agent_lee_code_mode",
      "leeway_runtime_fabric"
    )
    serialize_heavy_jobs = @(
      "agent-lee-sdxl-lightning-image-lane",
      "agent-lee-true-character-mesh-lane",
      "agent-lee-hunyuan3d-lane",
      "agent-lee-trellis-lane"
    )
  }
  created_at = (Get-Date).ToString("o")
}

$Knowledge | ConvertTo-Json -Depth 100 | Set-Content -Path $KnowledgeJsonPath -Encoding UTF8

$ToolRegistry = @{
  name = "agent_lee_3d_tool_registry"
  version = "1.0.0"
  tools = @(
    @{
      name = "analyze_image"
      purpose = "Inspect source image and detect whether it is full body, clean background, consistent, and suitable for 3D."
      input = @{
        image_path = "string"
      }
      output = @{
        ok = "boolean"
        verdict = "string"
        issues = "string[]"
        recommended_next_step = "string"
      }
    },
    @{
      name = "generate_source_pack"
      purpose = "Create or stage front/left/right/back source views."
      input = @{
        prompt = "string"
        negative_prompt = "string"
        mode = "single_sheet | separate_views | reference_conditioned"
      }
      output = @{
        ok = "boolean"
        source_pack_folder = "string"
        files = "string[]"
        receipt = "string"
      }
    },
    @{
      name = "validate_source_pack"
      purpose = "Gate source pack before 3D generation."
      input = @{
        source_pack_folder = "string"
      }
      output = @{
        ok = "boolean"
        missing = "string[]"
        rejected = "boolean"
        reasons = "string[]"
      }
    },
    @{
      name = "reconstruct_3d"
      purpose = "Run selected image-to-3D backend."
      input = @{
        backend = "triposr | hunyuan3d | trellis"
        source_image = "string"
        quality = "preview | final"
      }
      output = @{
        ok = "boolean"
        job_id = "string"
        model_glb = "string"
        model_obj = "string"
        receipt = "string"
      }
    },
    @{
      name = "optimize_mesh"
      purpose = "Clean, orient, simplify, and prepare mesh for runtime viewer."
      input = @{
        model_path = "string"
      }
      output = @{
        ok = "boolean"
        optimized_model = "string"
        issues = "string[]"
      }
    },
    @{
      name = "validate_asset"
      purpose = "Check if output is a real 3D asset, not a blob/card/shell."
      input = @{
        model_path = "string"
        source_standard = "string"
      }
      output = @{
        ok = "boolean"
        verdict = "accepted | rejected"
        reasons = "string[]"
      }
    },
    @{
      name = "export_glb"
      purpose = "Export final runtime-ready GLB."
      input = @{
        model_path = "string"
      }
      output = @{
        ok = "boolean"
        glb = "string"
        viewer = "string"
      }
    }
  )
  created_at = (Get-Date).ToString("o")
}

$ToolRegistry | ConvertTo-Json -Depth 100 | Set-Content -Path $ToolRegistryPath -Encoding UTF8

$PromptRules = @{
  name = "agent_lee_3d_prompt_rules"
  version = "1.0.0"
  positive_terms = @(
    "same exact character",
    "full body",
    "plain neutral gray background",
    "leathery dragon wings",
    "reptile dragon tail",
    "visible sword",
    "consistent armor",
    "consistent horns",
    "3D character model sheet",
    "clean studio lighting",
    "front side back turnaround",
    "game asset reference"
  )
  negative_terms = @(
    "castle",
    "archway",
    "city",
    "scenery",
    "cinematic poster",
    "floor shadow",
    "fog",
    "smoke",
    "feather wings",
    "bird wings",
    "angel wings",
    "feather tail",
    "missing sword",
    "missing tail",
    "cropped body",
    "cropped feet",
    "different characters",
    "inconsistent armor",
    "block",
    "blob",
    "relief card",
    "flat shell"
  )
  prompt_instruction = "For 3D source generation, prefer clean asset-reference language over cinematic concept-art language."
  planner_instruction = "Never rewrite a source-pack prompt into a castle, scenery, poster, or action-scene prompt."
  created_at = (Get-Date).ToString("o")
}

$PromptRules | ConvertTo-Json -Depth 100 | Set-Content -Path $PromptRulesPath -Encoding UTF8

$ValidationSchema = @{
  name = "agent_lee_3d_validation_schema"
  version = "1.0.0"
  source_pack_validation = @{
    required_files = @(
      "front_view_full_body_plain_background.png",
      "left_side_view_full_body_plain_background.png",
      "right_side_view_full_body_plain_background.png",
      "back_view_full_body_plain_background.png"
    )
    automatic_checks = @(
      "files_exist",
      "file_size_above_threshold",
      "not_duplicate_hashes",
      "contact_sheet_created"
    )
    manual_checks = @(
      "same_character",
      "actual_front_left_right_back",
      "full_body",
      "plain_background",
      "leathery_wings",
      "visible_tail",
      "visible_sword"
    )
  }
  asset_validation = @{
    reject_if = @(
      "flat_card",
      "relief_mesh",
      "red_block",
      "distorted_blob",
      "missing_body",
      "missing_wings",
      "missing_tail",
      "upside_down_without_corrected_export"
    )
    accept_if = @(
      "rotatable_mesh",
      "recognizable_character",
      "body_parts_present",
      "glb_export_exists",
      "viewer_opens",
      "receipt_written"
    )
  }
}

$ValidationSchema | ConvertTo-Json -Depth 100 | Set-Content -Path $ValidationSchemaPath -Encoding UTF8

$RuntimeManifest = @{
  name = "agent_lee_3d_skill_pipeline_manifest"
  version = "1.0.0"
  doctrine = $DoctrinePath
  knowledge_base = $KnowledgeJsonPath
  tool_registry = $ToolRegistryPath
  prompt_rules = $PromptRulesPath
  validation_schema = $ValidationSchemaPath
  default_pipeline = @(
    "analyze_image",
    "validate_source",
    "choose_backend",
    "reconstruct_3d",
    "optimize_mesh",
    "validate_asset",
    "export_glb",
    "write_receipt"
  )
  planner_prompt = @"
You are Agent Lee's 3D pipeline planner. You do not generate meshes directly.
You inspect the user's request and choose tools.

Rules:
1. Reject bad 3D sources before reconstruction.
2. Do not call TripoSR for final quality.
3. Prefer Hunyuan3D or TRELLIS for final character assets.
4. Keep live lanes available.
5. Serialize heavy jobs with a lock.
6. Return strict JSON only.
7. Never call a flat card, shell, red block, or blob a finished 3D character.
"@
  created_at = (Get-Date).ToString("o")
}

$RuntimeManifest | ConvertTo-Json -Depth 100 | Set-Content -Path $RuntimeManifestPath -Encoding UTF8

$Receipt = @{
  verdict = "AGENT_LEE_3D_KNOWLEDGE_PACK_INSTALLED"
  knowledge_root = $KnowledgeRoot
  doctrine = $DoctrinePath
  knowledge_base = $KnowledgeJsonPath
  tool_registry = $ToolRegistryPath
  prompt_rules = $PromptRulesPath
  validation_schema = $ValidationSchemaPath
  runtime_manifest = $RuntimeManifestPath
  next_step = "Patch Agent Lee planner/runtime to read runtime/agent-lee-3d-skill-pipeline.manifest.json before image or 3D jobs."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_3D_KNOWLEDGE_PACK_INSTALLED_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee 3D knowledge pack installed." -ForegroundColor Green
Write-Host "Knowledge root: $KnowledgeRoot" -ForegroundColor Cyan
Write-Host "Runtime manifest: $RuntimeManifestPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

explorer $KnowledgeRoot
notepad $DoctrinePath
notepad $RuntimeManifestPath