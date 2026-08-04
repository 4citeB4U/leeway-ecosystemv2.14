# Agent Lee 3D Game Asset Kernel

Port: 8095

Endpoints:
- GET /health
- GET /status
- GET /profiles
- POST /reconstruct
- POST /validate-game-asset

Truth:
- This kernel does not fake neural 3D.
- Neural Reconstruction READY requires a real backend such as TripoSR, InstantMesh, Unique3D, or another local image-to-3D engine.
- Procedural fallback is not Neural Reconstruction.
- Game asset validation can prove whether a GLB/OBJ is loadable and has mesh geometry.

Leeway Flow:
1. Vision Kernel 8093 sees/directs.
2. Creation Kernel 8094 generates image reference.
3. 3D Kernel 8095 reconstructs/validates game asset.
4. Discovery Layer records status.
5. Runtime Fabric and Leeway Standards receive mirror state.
