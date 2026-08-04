/*
FILE: pipeline\pipeline.cache.ts
PURPOSE: GPU pipeline cache for LeeWay execution die compute shaders.
TAG: CORE.RUNTIME.PIPELINE_CACHE.MAIN
REGION: 🟢 CORE
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: WebGPU
EXPORTS: getPipeline
STATUS: ACTIVE
*/

const pipelineCache = new WeakMap<GPUDevice, Map<string, GPUComputePipeline>>();

export function getPipeline(device: GPUDevice, pipelineId: string, shaderSource: string) {
  let deviceCache = pipelineCache.get(device);
  if (!deviceCache) {
    deviceCache = new Map<string, GPUComputePipeline>();
    pipelineCache.set(device, deviceCache);
  }

  const cached = deviceCache.get(pipelineId);
  if (cached) {
    return cached;
  }

  const module = device.createShaderModule({ code: shaderSource });
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module,
      entryPoint: 'main'
    }
  });

  deviceCache.set(pipelineId, pipeline);
  return pipeline;
}
