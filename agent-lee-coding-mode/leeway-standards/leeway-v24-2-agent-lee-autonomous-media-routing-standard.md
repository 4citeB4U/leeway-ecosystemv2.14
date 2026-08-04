# Leeway V24.2 Agent Lee Autonomous Media Routing Standard

Created: 2026-06-28T04:46:28.1632954Z

## Purpose

Agent Lee must not manually decide every media workflow alone.

When Agent Lee receives a task involving media, video, movies, audio, images, PDFs, spreadsheets, documents, or creative media preparation, Agent Lee routes the task through the Leeway Media Router.

## Router

Host endpoint:
http://127.0.0.1:5301

Internal Docker endpoint:
http://leeway-media-router:5301

Dispatch endpoint:
http://leeway-media-router:5301/dispatch

## Route Targets

The router coordinates:

- Media Ingestion Layer
- Runtime Fabric
- MCP Center
- Worker Center
- Vision lane
- Audio lane
- Creation lane
- Document lane

## Truth Rule

This router performs routing and delegation.

It does not itself perform full video analysis, audio generation, movie creation, legal review, or book writing. Those actions must be performed by the correct downstream agent, MCP, worker, LLM lane, or service.