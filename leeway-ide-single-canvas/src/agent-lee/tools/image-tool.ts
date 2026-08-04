/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.TOOLS.IMAGE_TOOL
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export async function analyzeImage(path: string) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      model: "qwen2.5vl:7b",
      prompt: "Describe this image in detail for a developer.",
      images: [require("fs").readFileSync(path, {encoding:"base64"})]
    })
  });

  const data:any = await response.json();
  return data.response;
}

