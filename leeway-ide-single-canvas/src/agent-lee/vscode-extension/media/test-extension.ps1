#!/usr/bin/env pwsh
<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.TEST_EXTENSION
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir,
  [switch]$Build,
  [switch]$Package,
  [switch]$Install,
  [switch]$CheckOllama
)

$ErrorActionPreference = "Stop"

$doctor = Join-Path $PSScriptRoot "agent-lee\scripts\Invoke-AgentLeeDoctor.ps1"

& $doctor `
  -ExtensionDir $ExtensionDir `
  -SkipBuild:(!$Build) `
  -SkipPackage:(!$Package) `
  -Install:$Install `
  -CheckOllama:$CheckOllama

