# Leeway V24.1 Media Ingestion Runtime Standard

Created: 2026-06-28T04:31:58.3626266Z

## Purpose

The media ingestion layer is the canonical runtime entry point for external media entering the Leeway ecosystem.

It supports routing for:
- runtime-fabric
- vision
- creation
- audio
- documents

## Runtime Service

Container: leeway_media_ingestion_layer
Host endpoint: http://127.0.0.1:5300
Internal endpoint: http://leeway-media-ingestion-layer:5300

## MCP Contracts Added

- leeway-media-ingestion-mcp
- leeway-video-analysis-ingestion-mcp
- leeway-audio-analysis-ingestion-mcp
- leeway-document-media-ingestion-mcp

## Workers Added

- 2 workers per new MCP contract
- execution worker
- audit worker

## Truth Rule

Media ingestion receives and normalizes media. It does not by itself complete full movie analysis, full audio generation, full video creation, or document understanding. Those must be delegated to downstream agents, MCPs, LLM lanes, and workers.