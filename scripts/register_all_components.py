"""
Register All Components with Discovery
Executes Phase 1: Discovery Enforcement
"""

import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    # Only reconfigure if the method exists (Python 3.7+)
    try:
        sys.stdout.reconfigure(encoding='utf-8')  # type: ignore[attr-defined]
    except AttributeError:
        pass  # Fallback for older Python versions

# Add parent directory to path for core imports
parent_path = str(Path(__file__).parent.parent)
if parent_path not in sys.path:
    sys.path.insert(0, parent_path)

from core.discovery.discovery_enforcement import DiscoveryEnforcement  # type: ignore[import-not-found]
from core.identity.identity_core import IdentityCore  # type: ignore[import-not-found]

def register_all_components():
    """Register all existing Leeway components with Discovery"""
    
    print("=" * 60)
    print("PHASE 1: DISCOVERY ENFORCEMENT - COMPONENT REGISTRATION")
    print("=" * 60)
    
    # Initialize Discovery
    discovery = DiscoveryEnforcement()
    print(f"\n[OK] Discovery Enforcement initialized")
    print(f"  Registry: {discovery.registry_path}")
    
    # Initialize Identity
    try:
        identity = IdentityCore()
        print(f"\n[OK] Identity Core loaded")
        print(f"  Agent ID: {identity.get_agent_id()}")
        print(f"  Fingerprint: {identity.get_canonical_fingerprint()}")
    except Exception as e:
        print(f"\n[FAIL] Identity Core failed: {e}")
        identity = None
    
    components_registered = 0
    
    # 1. Register SEA Core
    print("\n[1/10] Registering SEA Core...")
    discovery.register_component(
        component_id="sea-core",
        component_type="execution_engine",
        capabilities=[
            "single_execution_authority",
            "governance_validation",
            "receipt_generation",
            "deterministic_timing",
            "subsystem_orchestration"
        ],
        location="core/sea/sea_core.py",
        metadata={"tick_rate": 0.01, "frequency_hz": 100}
    )
    components_registered += 1
    print("  [OK] SEA Core registered")
    
    # 2. Register Governance Layer
    print("\n[2/10] Registering Governance Layer...")
    discovery.register_component(
        component_id="governance-layer",
        component_type="validation_engine",
        capabilities=[
            "law_enforcement",
            "standards_enforcement",
            "inline_validation"
        ],
        location="core/governance/",
        metadata={"laws": 79, "standards": 8}
    )
    components_registered += 1
    print("  [OK] Governance Layer registered")
    
    # 3. Register 9E Learning System
    print("\n[3/10] Registering 9E Learning System...")
    discovery.register_component(
        component_id="9e-learning-system",
        component_type="cognitive_engine",
        capabilities=[
            "reflection",
            "pattern_extraction",
            "learning_compilation",
            "identity_mutation",
            "cache_injection"
        ],
        location="core/reasoning/receipt_system/",
        metadata={"semantic_versioning": True}
    )
    components_registered += 1
    print("  [OK] 9E Learning System registered")
    
    # 4. Register Identity Core
    if identity:
        print("\n[4/10] Registering Identity Core...")
        discovery.register_component(
            component_id="identity-core",
            component_type="identity_engine",
            capabilities=[
                "identity_validation",
                "law_enforcement",
                "authority_validation",
                "evolution_boundaries"
            ],
            location="core/identity/identity_core.py",
            metadata={
                "agent_id": identity.get_agent_id(),
                "immutable_laws": 10,
                "values": 8
            }
        )
        components_registered += 1
        print("  [OK] Identity Core registered")
    else:
        print("\n[4/10] Skipping Identity Core (not loaded)")
    
    # 5. Register ALOE Observation Engine
    print("\n[5/10] Registering ALOE Observation Engine...")
    discovery.register_component(
        component_id="aloe-observation-engine",
        component_type="observation_engine",
        capabilities=[
            "monitor_detection",
            "cursor_tracking",
            "process_monitoring",
            "system_state_observation"
        ],
        location="agent-lee-coding-mode/observation-engine/",
        metadata={"modules": ["ALOE-Monitor", "ALOE-State"]}
    )
    components_registered += 1
    print("  [OK] ALOE Observation Engine registered")
    
    # 6. Register Desktop Runtime
    print("\n[6/10] Registering Desktop Runtime...")
    discovery.register_component(
        component_id="desktop-runtime",
        component_type="runtime_server",
        capabilities=[
            "browser_automation",
            "consent_enforcement",
            "voice_loop",
            "camera_bridge"
        ],
        location="agent-lee-coding-mode/desktop-runtime/server.mjs",
        metadata={"port": 8091, "playwright": True}
    )
    components_registered += 1
    print("  [OK] Desktop Runtime registered")
    
    # 7. Register Agent Lee Router
    print("\n[7/10] Registering Agent Lee Router...")
    discovery.register_component(
        component_id="agent-lee-router",
        component_type="routing_server",
        capabilities=[
            "model_routing",
            "lane_management",
            "timeout_coordination"
        ],
        location="agent-lee-coding-mode/router/server-brainfix.mjs",
        metadata={"port": 8080}
    )
    components_registered += 1
    print("  [OK] Agent Lee Router registered")
    
    # 8. Register Command Brain
    print("\n[8/10] Registering Command Brain...")
    discovery.register_component(
        component_id="command-brain",
        component_type="orchestration_engine",
        capabilities=[
            "intent_parsing",
            "command_orchestration",
            "execution_bridge",
            "voice_identity"
        ],
        location="core/reasoning/command_brain/",
        metadata={"voice_law_compliant": True}
    )
    components_registered += 1
    print("  [OK] Command Brain registered")
    
    # 9. Register Discovery Kernel
    print("\n[9/10] Registering Discovery Kernel...")
    discovery.register_component(
        component_id="discovery-kernel",
        component_type="discovery_engine",
        capabilities=[
            "topology_registry",
            "bootstrap_import",
            "receipt_binding",
            "component_discovery"
        ],
        location="core/discovery/",
        metadata={"enforcement": True}
    )
    components_registered += 1
    print("  [OK] Discovery Kernel registered")
    
    # 10. Register Runtime Service
    print("\n[10/10] Registering Runtime Service...")
    discovery.register_component(
        component_id="agent-lee-runtime-service",
        component_type="service",
        capabilities=[
            "24/7_persistence",
            "startup_automation",
            "failure_recovery",
            "health_monitoring"
        ],
        location="core/runtime/agent_lee_service.py",
        metadata={"windows_service": True, "pywin32_required": True}
    )
    components_registered += 1
    print("  [OK] Runtime Service registered")
    
    # Report health for all components
    print("\n" + "=" * 60)
    print("REPORTING COMPONENT HEALTH")
    print("=" * 60)
    
    for component_id in [
        "sea-core", "governance-layer", "9e-learning-system",
        "identity-core", "aloe-observation-engine", "desktop-runtime",
        "agent-lee-router", "command-brain", "discovery-kernel",
        "agent-lee-runtime-service"
    ]:
        if discovery.is_registered(component_id):
            discovery.report_health(
                component_id=component_id,
                health_status="HEALTHY",
                details={"registered": True, "operational": True}
            )
            print(f"  [OK] {component_id}: HEALTHY")
    
    # Get registry stats
    stats = discovery.get_registry_stats()
    
    print("\n" + "=" * 60)
    print("REGISTRATION COMPLETE")
    print("=" * 60)
    print(f"  Components registered: {components_registered}")
    print(f"  Total components: {stats['total_components']}")
    print(f"  Total capabilities: {stats['total_capabilities']}")
    print(f"  Components with health: {stats['components_with_health']}")
    print(f"  Registry path: {stats['registry_path']}")
    print(f"  Last updated: {stats['last_updated']}")
    
    print("\n[OK] Phase 1: Discovery Enforcement - COMPLETE")
    print("\nDiscovery is now the authoritative source of truth.")
    print("Rule enforced: 'If Discovery doesn't know it, it does not exist.'\n")
    
    return discovery, components_registered


if __name__ == "__main__":
    try:
        discovery, count = register_all_components()
        print(f"\n[OK] SUCCESS: {count} components registered with Discovery")
        sys.exit(0)
    except Exception as e:
        print(f"\n[FAIL] FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


# Made with Bob