// LEEWAY STANDARDS COMPLIANT | REGION: L7_EXECUTION_DIE
// ALU: DATA_NORMALIZER | AGENT_OWNER: LWA_Architect
// DETERMINISTIC_ID: alu-norm-001 | SOVEREIGNTY_CHECK: PASSED

struct Params {
    input_size: u32,
    min_val: f32,
    max_val: f32,
};

@group(0) @binding(0) var<storage, read> input_data: array<f32>;
@group(0) @binding(1) var<storage, read_write> output_data: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if (idx >= params.input_size) { return; }

    let val = input_data[idx];
    output_data[idx] = (val - params.min_val) / (params.max_val - params.min_val);
}
