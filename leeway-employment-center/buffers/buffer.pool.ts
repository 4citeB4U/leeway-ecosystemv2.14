/*
FILE: buffers\buffer.pool.ts
PURPOSE: Reusable GPU buffer pool for LeeWay tensor execution workloads.
TAG: CORE.RUNTIME.BUFFER_POOL.MAIN
REGION: 🟢 CORE
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: WebGPU
EXPORTS: BufferPool
STATUS: ACTIVE
*/

type PooledBuffer = {
  size: number;
  buffer: GPUBuffer;
  inUse: boolean;
};

export class BufferPool {
  private readonly buffers: PooledBuffer[] = [];

  constructor(
    private readonly device: GPUDevice,
    private readonly usage: GPUBufferUsageFlags = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  ) {}

  acquire(size: number) {
    const reusable = this.buffers.find((entry) => !entry.inUse && entry.size >= size);
    if (reusable) {
      reusable.inUse = true;
      return reusable.buffer;
    }

    const buffer = this.device.createBuffer({
      size,
      usage: this.usage
    });

    this.buffers.push({
      size,
      buffer,
      inUse: true
    });

    return buffer;
  }

  release(buffer: GPUBuffer) {
    const pooled = this.buffers.find((entry) => entry.buffer === buffer);
    if (pooled) {
      pooled.inUse = false;
    }
  }

  destroy() {
    for (const entry of this.buffers) {
      entry.buffer.destroy();
    }
    this.buffers.length = 0;
  }
}
