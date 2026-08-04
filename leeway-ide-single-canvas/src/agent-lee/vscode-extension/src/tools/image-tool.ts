/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.TOOLS.IMAGE.MAIN
PURPOSE: Vision-model image analysis helper governed through Agent Lee runtime prompt wrapping.

5WH:
WHAT = Sends local image analysis requests to the configured Ollama vision model.
WHY = Lets Agent Lee inspect screenshots and image context without leaving the local runtime.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/tools/image-tool.ts
WHEN = 2026
HOW = Base64 encodes the image and posts it to the Ollama generate endpoint.
*/

import * as fs from "fs";
import { buildModelPromptThroughAgentLee } from "../core/agent-lee-runtime-bootstrap";

export async function analyzeImage(path: string, model = "qwen2.5vl:7b") {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      model,
      stream: false,
      prompt: buildModelPromptThroughAgentLee(
        "Analyze this image for a developer. Summarize UI, text, structure, possible code relevance, and issues.",
        {
          taskContext: "Visual attachment analysis for Agent Lee runtime.",
          modelName: model
        }
      ),
      images: [fs.readFileSync(path, {encoding:"base64"})]
    })
  });

  const data:any = await response.json();
  return data.response || "No image response.";
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
