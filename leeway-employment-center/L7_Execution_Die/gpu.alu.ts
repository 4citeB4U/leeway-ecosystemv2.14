/*
FILE: L7_Execution_Die\gpu.alu.ts
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: CORE.RUNTIME.G_PU_A_LU.MAIN
REGION: 🟢 CORE
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
// LEEWAY STANDARDS COMPLIANT | REGION: L7_EXECUTION_DIE
// COMPONENT: GPU_ALU_DISPATCH | AGENT_OWNER: LWA_Architect
// DETERMINISTIC_ID: gpu-alu-001 | SOVEREIGNTY_CHECK: PASSED

// @ts-ignore - Assuming implementation exists or will be provided
import { getPipeline } from '../pipeline/pipeline.cache';
// @ts-ignore
import { BufferPool } from '../buffers/buffer.pool';
// @ts-ignore
import tensorMatmulShader from './shaders/tensor_matmul.wgsl';

export const TensorMultiplier = async (device: GPUDevice, pool: BufferPool, params: { size: number, A: Float32Array, B: Float32Array }) => {
    const { size, A, B } = params;
    const outputSize = size * size * Float32Array.BYTES_PER_ELEMENT;
    
    // Acquire buffers from the pool, respecting the Isomorphic Material Law
    const gpuBufA = pool.acquire(A.byteLength);
    const gpuBufB = pool.acquire(B.byteLength);
    const gpuBufC = pool.acquire(outputSize); // Output buffer

    // Safety assertion (Gold Contact Law)
    if (gpuBufA === gpuBufB || gpuBufA === gpuBufC || gpuBufB === gpuBufC) {
        throw new Error("LEEWAY VIOLATION: BUFFER ALIASING DETECTED IN TENSOR_MATMULT");
    }

    device.queue.writeBuffer(gpuBufA, 0, A);
    device.queue.writeBuffer(gpuBufB, 0, B);

    const shaderPipeline = getPipeline(device, 'tensor_matmul', tensorMatmulShader);

    const paramBuffer = device.createBuffer({
        size: Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(paramBuffer, 0, new Uint32Array([size]));

    const bindGroup = device.createBindGroup({
        layout: shaderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: gpuBufA } },
            { binding: 1, resource: { buffer: gpuBufB } },
            { binding: 2, resource: { buffer: gpuBufC } },
            { binding: 3, resource: { buffer: paramBuffer } },
        ],
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(shaderPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    const workgroupSize = 8; // Matches TILE_SIZE
    passEncoder.dispatchWorkgroups(
        Math.ceil(size / workgroupSize),
        Math.ceil(size / workgroupSize)
    );
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    // Read back C for verification (L8 Telemetry)
    const readBuffer = device.createBuffer({
        size: outputSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const copyEncoder = device.createCommandEncoder();
    copyEncoder.copyBufferToBuffer(gpuBufC, 0, readBuffer, 0, outputSize);
    device.queue.submit([copyEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();
    readBuffer.destroy(); // LWA_Janitor: Zero-Leak Policy

    // Release buffers back to the pool (LWA_Janitor: Memory Management)
    pool.release(gpuBufA);
    pool.release(gpuBufB);
    pool.release(gpuBufC);
    paramBuffer.destroy(); // Release uniform buffer

    return result;
};

