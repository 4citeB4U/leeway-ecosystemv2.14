// LEEWAY STANDARDS COMPLIANT | REGION: L7_EXECUTION_DIE
// ALU: TENSOR_MATMUL | AGENT_OWNER: LWA_Architect
// DETERMINISTIC_ID: alu-matmul-001 | SOVEREIGNTY_CHECK: PASSED

struct Params {
    size: u32,
};

@group(0) @binding(0) var<storage, read> A: array<f32>;
@group(0) @binding(1) var<storage, read> B: array<f32>;
@group(0) @binding(2) var<storage, read_write> C: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

const TILE_SIZE: u32 = 8u; 

var<workgroup> tileA: array<f32, 64>; // TILE_SIZE * TILE_SIZE
var<workgroup> tileB: array<f32, 64>;

@compute @workgroup_size(8, 8, 1) // Matches TILE_SIZE
fn main(
    @builtin(global_invocation_id) gid: vec3<u32>,
    @builtin(local_invocation_id) lid: vec3<u32>
) {
    let size = params.size;
    let row = gid.y;
    let col = gid.x;

    if (row >= size || col >= size) { return; }

    var sum: f32 = 0.0;
    for (var t: u32 = 0u; t < size; t += TILE_SIZE) {
        let global_row_a = row;
        let global_col_a = t + lid.x;
        let global_row_b = t + lid.y;
        let global_col_b = col;

        if (global_row_a < size && global_col_a < size) {
            tileA[lid.y * TILE_SIZE + lid.x] = A[global_row_a * size + global_col_a];
        } else {
            tileA[lid.y * TILE_SIZE + lid.x] = 0.0;
        }

        if (global_row_b < size && global_col_b < size) {
            tileB[lid.y * TILE_SIZE + lid.x] = B[global_row_b * size + global_col_b];
        } else {
            tileB[lid.y * TILE_SIZE + lid.x] = 0.0;
        }

        workgroupBarrier();

        for (var k: u32 = 0u; k < TILE_SIZE; k++) {
            sum += tileA[lid.y * TILE_SIZE + k] * tileB[k * TILE_SIZE + lid.x];
        }
        workgroupBarrier();
    }
    C[row * size + col] = sum;
}
